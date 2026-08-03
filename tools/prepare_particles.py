# -*- coding: utf-8 -*-
"""prepare_particles.py — 把 GLB 预采样为 18 万粒子数据文件(particles.bin)

与 showcase.js 的浏览器内采样算法完全一致:
- 面积加权均匀采样(85%)+ 高曲率/轮廓细节采样(15%,免 acos 权重)
- UV 从基础色贴图取色(glTF v=0 顶部约定),回退材质色/主题色
- 世界坐标 → 模型局部空间(归一化 scale=2/max + 居中 + modelRotation Y-90°)
输出二进制(约 4MB):
  header : magic "PTCL" u32 | version u32 | count u32
           meshCount u32 | triCount u32 | totalArea f32
           bboxSize f32×3 | scale f32
  targets: f32 × count × 3
  normals: u8  × count × 3   (n+1)/2×255
  colors : u8  × count × 3
  meta   : u8  × count × 4   [seed, delay, edge, size 量化]
用法: python tools/prepare_particles.py
作者: Ligong-Wenchang  日期: 2026-08-04
"""
import struct
import json
import io
import sys
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"D:\BaiduNetdiskDownload\天空之城素材包\资产\幻想欧式天空建筑\第三次迭代.glb"
OUT = os.path.join(ROOT, "assets", "particles.bin")

N_PARTICLES = 180000
DETAIL_RATIO = 0.15
MODEL_ROTATION_Y = -np.pi / 2  # 与 showcase-config.js modelRotation 一致


# ---------------- GLB 解析 ----------------
def load_glb(path):
    with open(path, "rb") as f:
        f.read(12)
        gltf, bindata = None, None
        while True:
            clen, ctype = struct.unpack("<II", f.read(8))
            cdata = f.read(clen)
            if ctype == 0x4E4F534A:
                gltf = json.loads(cdata.decode("utf-8"))
            elif ctype == 0x004E4942:
                bindata = cdata
                break
    return gltf, bindata


def read_accessor(gltf, bindata, acc_idx):
    acc = gltf["accessors"][acc_idx]
    bv = gltf["bufferViews"][acc["bufferView"]]
    off = bv.get("byteOffset", 0) + acc.get("byteOffset", 0)
    ncomp = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[acc["type"]]
    dt = {5120: "i1", 5121: "u1", 5122: "i2", 5123: "i2", 5125: "u4", 5126: "f4"}[
        acc["componentType"]
    ]
    arr = np.frombuffer(
        bindata, dtype=dt, count=acc["count"] * ncomp, offset=off
    ).reshape(acc["count"], ncomp)
    return np.array(arr, copy=True), acc


def quat_to_mat(q):
    x, y, z, w = q
    return np.array(
        [
            [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
            [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
            [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
        ]
    )


def node_world_matrices(gltf):
    nodes = gltf["nodes"]
    world = {}

    def compute(i, parent):
        n = nodes[i]
        T = np.eye(4)
        if "matrix" in n:
            T = np.array(n["matrix"]).reshape(4, 4)
        else:
            if "translation" in n:
                T[:3, 3] = n["translation"]
            if "rotation" in n:
                T[:3, :3] = quat_to_mat(n["rotation"])
            if "scale" in n:
                T[:3, :3] = T[:3, :3] @ np.diag(n["scale"])
        world[i] = parent @ T
        for c in n.get("children", []):
            compute(c, world[i])

    for r in gltf["scenes"][gltf["scene"]].get("nodes", []):
        compute(r, np.eye(4))
    return world


def extract_meshes(gltf, bindata):
    """返回 [{pos_world, idx, uv, mat_idx, image}] 列表(世界坐标)"""
    world = node_world_matrices(gltf)
    out = []
    for ni, n in enumerate(gltf["nodes"]):
        if n.get("mesh") is None:
            continue
        prim = gltf["meshes"][n["mesh"]]["primitives"][0]
        pos, _ = read_accessor(gltf, bindata, prim["attributes"]["POSITION"])
        pos4 = np.column_stack([pos, np.ones(len(pos))]) @ world[ni].T
        idx = None
        if "indices" in prim:
            idx, _ = read_accessor(gltf, bindata, prim["indices"])
        uv = None
        if "TEXCOORD_0" in prim["attributes"]:
            uv, _ = read_accessor(gltf, bindata, prim["attributes"]["TEXCOORD_0"])
        mat_idx = prim.get("material")
        # 第三次迭代导出丢失了主 mesh 的 UV:标记 planar 投影轴(最薄轴),
        # 取色时按盘面坐标直接映射贴图,避免全部退化为兜底色
        planar_axis = None
        if uv is None:
            mn = pos4[:, :3].min(axis=0)
            mx = pos4[:, :3].max(axis=0)
            planar_axis = ["x", "y", "z"][int(np.argmin(mx - mn))]
        out.append(
            {
                "pos": pos4[:, :3].astype(np.float64),
                "idx": idx,
                "uv": uv,
                "mat_idx": mat_idx,
                "planar_axis": planar_axis,
            }
        )
    return out


def extract_images(gltf, bindata):
    """返回 {mat_idx: PIL.Image} — 材质→基础色贴图"""
    mats = {}
    for i, t in enumerate(gltf.get("textures", [])):
        src = t.get("source")
        if src is None or src >= len(gltf["images"]):
            continue
        img = gltf["images"][src]
        bv = gltf["bufferViews"][img["bufferView"]]
        data = bindata[bv.get("byteOffset", 0): bv.get("byteOffset", 0) + bv["byteLength"]]
        mats[i] = Image.open(io.BytesIO(data)).convert("RGB")
    # 材质 → 纹理 → 图像
    mat_to_img = {}
    for mi, m in enumerate(gltf.get("materials", [])):
        bc = m.get("pbrMetallicRoughness", {}).get("baseColorTexture")
        if bc is not None and bc["index"] in mats:
            mat_to_img[mi] = mats[bc["index"]]
    return mat_to_img


# ---------------- 采样 ----------------
def build_weights(mesh, rng):
    """面积 + 免 acos 细节权重(与 showcase.js 一致)"""
    idx = mesh["idx"]
    P = mesh["pos"]
    tris = idx.reshape(-1, 3) if idx is not None else np.arange(len(P)).reshape(-1, 3)
    A = P[tris[:, 0]]
    e1 = P[tris[:, 1]] - A
    e2 = P[tris[:, 2]] - A
    cross = np.cross(e1, e2)
    areas = np.linalg.norm(cross, axis=1) * 0.5
    # 免 acos 高曲率权重:最大角 cos → angleF = clamp((0.5-cosMax)/1.5, 0, 1)
    l1 = np.linalg.norm(e1, axis=1)
    l2 = np.linalg.norm(e2, axis=1)
    l3 = np.linalg.norm(P[tris[:, 1]] - P[tris[:, 2]], axis=1)
    lmax = np.maximum(np.maximum(l1, l2), l3)
    with np.errstate(divide="ignore", invalid="ignore"):
        cos12 = np.where(lmax == l1, (l2**2 + l3**2 - l1**2) / (2 * l2 * l3), np.nan)
        cos13 = np.where(lmax == l2, (l1**2 + l3**2 - l2**2) / (2 * l1 * l3), np.nan)
        cos23 = np.where(lmax == l3, (l1**2 + l2**2 - l3**2) / (2 * l1 * l2), np.nan)
    cosmax = np.nan_to_num(cos12, nan=np.nan_to_num(cos13, nan=np.nan_to_num(cos23, nan=1.0)))
    cosmax = np.clip(cosmax, -1, 1)
    angleF = np.clip((0.5 - cosmax) / 1.5, 0, 1)
    detailW = areas * (0.3 + 0.7 * angleF)
    return tris, areas, detailW


def pick_by_cum(rng, cum, total, n):
    """向量化二分抽样(与 JS pickIndex 同分布)"""
    r = rng.random(n) * total
    return np.searchsorted(cum, r)


def sample_color(mesh, mat_to_img, tris, s, t, pts):
    """UV 插值取色 → u8×n×3;无 UV 用 planar 投影;无贴图 → fallback"""
    n = len(s)
    col = np.zeros((n, 3), dtype=np.uint8)
    img = mat_to_img.get(mesh["mat_idx"])
    if img is None:
        col[:] = (255, 239, 230, 207)[:3]  # 主题米白兜底
        return col
    if mesh["uv"] is None and mesh.get("planar_axis"):
        # 无 UV 的薄盘:沿最薄轴(盘面法线)做平面投影映射贴图中央。
        # 直接用采样点局部坐标投影(pts 已是三角形重心插值结果)。
        ax = mesh["planar_axis"]
        ai = {"x": 1, "y": 2, "z": 0}[ax]  # 盘面两轴
        bi = {"x": 2, "y": 0, "z": 1}[ax]
        uu = (pts[:, ai] + 1) / 2  # 局部坐标 [-1,1] → UV [0,1]
        vv = (pts[:, bi] + 1) / 2
    elif mesh["uv"] is None:
        col[:] = (255, 239, 230, 207)[:3]
        return col
    else:
        uv = mesh["uv"]
        uvA = uv[tris[:, 0]]
        uvB = uv[tris[:, 1]]
        uvC = uv[tris[:, 2]]
        uvuv = (1 - s - t)[:, None] * uvA + s[:, None] * uvB + t[:, None] * uvC
        uu = uvuv[:, 0]
        vv = uvuv[:, 1]
    uu = np.clip(uu, 0, 1)
    vv = np.clip(vv, 0, 1)
    w, h = img.size
    px = np.clip(np.round(uu * (w - 1)), 0, w - 1).astype(int)
    py = np.clip(np.round(vv * (h - 1)), 0, h - 1).astype(int)
    arr = np.asarray(img)
    col[:] = arr[py, px]  # glTF v=0 顶部 ↔ PIL y=0 顶部,与浏览器一致
    # 金色增强:仅提亮中等亮度的暖色(暗金浮雕),亮白/米白不动,避免过曝
    warm = (col[:, 0] > 100) & (col[:, 0] < 215) & (col[:, 0].astype(int) - col[:, 2].astype(int) > 40)
    if warm.any():
        col[warm, 0] = np.minimum(255, (col[warm, 0].astype(np.float32) * 1.28)).astype(np.uint8)
        col[warm, 1] = np.minimum(255, (col[warm, 1].astype(np.float32) * 1.12)).astype(np.uint8)
    return col


def scatter_meta(kind, n, rng):
    """seed/delay/edge/size — 与 showcase.js 完全一致"""
    seed = rng.random(n)
    if kind == "surface":
        delay = 0.7 + seed * 0.3
        edge = rng.random(n) * 0.25
        size = 0.95 + rng.random(n) * 0.1
    else:
        delay = 0.2 * 0.7 + seed * 0.3
        edge = 0.7 + rng.random(n) * 0.3
        size = 1.05 + rng.random(n) * 0.15
    return seed, delay, edge, size


def main():
    print("解析 GLB:", SRC)
    gltf, bindata = load_glb(SRC)
    meshes = extract_meshes(gltf, bindata)
    mat_to_img = extract_images(gltf, bindata)
    rng = np.random.default_rng(20260804)

    # 每 mesh 面积/权重 + 世界包围盒
    prepped = []
    allmin = np.array([1e9] * 3)
    allmax = np.array([-1e9] * 3)
    for m in meshes:
        tris, areas, detailW = build_weights(m, rng)
        prepped.append({"mesh": m, "tris": tris, "areas": areas, "detailW": detailW})
        pts = m["pos"][tris]
        allmin = np.minimum(allmin, pts.min(axis=(0, 1)))
        allmax = np.maximum(allmax, pts.max(axis=(0, 1)))

    total_area = sum(p["areas"].sum() for p in prepped)
    total_detail = sum(p["detailW"].sum() for p in prepped)
    tri_count = sum(len(p["tris"]) for p in prepped)
    print(f"mesh={len(meshes)} tri={tri_count} totalArea={total_area:.2f} bbox={allmax-allmin}")

    # 归一化 = 顺序变换:先居中(T' = -center)、再旋转(R = rotY(-π/2))、再缩放(S)
    # (实测校准:浏览器 GLB 模式粒子 = 原始世界坐标经此顺序变换,±1.4 → ±1.0)
    bbox_size = allmax - allmin
    scale = 2.0 / max(bbox_size.max(), 1e-6)
    center = (allmin + allmax) / 2
    c, s = np.cos(MODEL_ROTATION_Y), np.sin(MODEL_ROTATION_Y)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])  # rotY(-π/2)

    def to_local(mesh):
        pts = mesh["pos"] - center  # 居中
        pts = pts @ R.T  # 旋转
        pts = pts * scale  # 缩放
        return pts.astype(np.float32)

    # 粒子分配(round + 补差,总数精确)
    # 小盘(金字浮雕,mesh 下标 0)面积小但细节重要:加权 ×2,
    # 保证"繁荣昌盛"笔画粒子密度(规范允许调整采样分布以辨认细节)
    detail_n = round(N_PARTICLES * DETAIL_RATIO)
    surface_n = N_PARTICLES - detail_n
    surf_weights = [p["areas"].sum() * (2.0 if i == 0 else 1.0) for i, p in enumerate(prepped)]
    det_weights = [p["detailW"].sum() * (2.0 if i == 0 else 1.0) for i, p in enumerate(prepped)]
    surf_counts = [round(surface_n * (w / sum(surf_weights))) for w in surf_weights]
    surf_counts[np.argmax(surf_counts)] += surface_n - sum(surf_counts)
    det_counts = [round(detail_n * (w / sum(det_weights))) for w in det_weights]
    det_counts[np.argmax(det_counts)] += detail_n - sum(det_counts)

    targets = np.zeros((N_PARTICLES, 3), dtype=np.float32)
    normals = np.zeros((N_PARTICLES, 3), dtype=np.float32)
    colors = np.zeros((N_PARTICLES, 3), dtype=np.uint8)
    meta = np.zeros((N_PARTICLES, 4), dtype=np.uint8)

    p = 0
    for prep, sc, dc in zip(prepped, surf_counts, det_counts):
        m = prep["mesh"]
        tris, areas, detailW = prep["tris"], prep["areas"], prep["detailW"]
        local = to_local(m)
        P = local[tris]
        vA = P[:, 0]
        e1 = P[:, 1] - P[:, 0]
        e2 = P[:, 2] - P[:, 0]
        for kind, count, weights, cum_total in (
            ("surface", sc, areas, areas.sum()),
            ("detail", dc, detailW, detailW.sum()),
        ):
            if count <= 0:
                continue
            tri_idx = pick_by_cum(rng, np.cumsum(weights), cum_total, count)
            tri_idx = np.clip(tri_idx, 0, len(weights) - 1)
            r1 = np.sqrt(rng.random(count))
            r2 = rng.random(count)
            s = r1 * (1 - r2)
            t = r1 * r2
            if kind == "detail":  # 细节粒子偏向三角形边
                e = rng.integers(0, 3, count)
                f = rng.random(count)
                s = np.where(e == 0, 1 - f, np.where(e == 1, 1 - f, 0))
                t = np.where(e == 0, 0, np.where(e == 1, f, 1 - f))
            pts = vA[tri_idx] + s[:, None] * e1[tri_idx] + t[:, None] * e2[tri_idx]
            nrm = np.cross(e1[tri_idx], e2[tri_idx])
            nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-12)
            col = sample_color(m, mat_to_img, tris[tri_idx], s, t, pts)
            seed, delay, edge, size = scatter_meta(kind, count, rng)
            q = p + count
            targets[p:q] = pts
            normals[p:q] = nrm
            colors[p:q] = col
            meta[p:q, 0] = np.clip(seed * 255, 0, 255).astype(np.uint8)
            meta[p:q, 1] = np.clip(delay * 255, 0, 255).astype(np.uint8)
            meta[p:q, 2] = np.clip(edge * 255, 0, 255).astype(np.uint8)
            meta[p:q, 3] = np.clip((size - 0.9) / 0.35 * 255, 0, 255).astype(np.uint8)
            p = q
        print(f"  mesh: {sc}+{dc} 粒子")

    assert p == N_PARTICLES, f"粒子数不精确: {p} != {N_PARTICLES}"

    # 输出
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "wb") as f:
        f.write(struct.pack("<4sIIII f 3f f", b"PTCL", 1, N_PARTICLES,
                            len(meshes), tri_count, total_area,
                            *bbox_size.astype(np.float32), scale))
        targets.tofile(f)
        ((normals * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8).tofile(f)
        colors.tofile(f)
        meta.tofile(f)
    size = os.path.getsize(OUT)
    print(f"写出 {OUT}: {size/1e6:.2f} MB,粒子 {p}")


if __name__ == "__main__":
    main()
