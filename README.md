# Scale Studio

Scale Studio 用真实空间尺寸和店内实拍图，帮助活动客户检查设计物料的制作尺寸、位置关系与现场效果。

## 在线测试

- 地址：<https://stephanielizy.github.io/scale-studio/>
- 上海店共享测试码：`SHANGHAI-20`
- 管理测试口令：`ADMIN-DEMO`

## 当前可测试流程

1. 通过共享授权码创建独立成员身份。
2. 选择唱片墙、洞洞墙或明确标记的模拟空间。
3. 在同一毫米坐标系中切换轮廓视图和实拍视图。
4. 上传图片，拖动、缩放、旋转并输入真实尺寸。
5. 导出 PNG、CSV 和项目 JSON。
6. 创建只读项目快照链接。
7. 用个人恢复链接在另一台设备恢复测试身份和项目快照。
8. 从管理测试入口查看本浏览器中的成员和项目内容。

## 数据说明

- 唱片墙：6 × 9 单元，单格 32 × 32 cm，圆孔内径 26 cm，整体推导尺寸 192 × 288 cm。
- 洞洞墙：470 × 200 cm；实拍图待补。
- 临窗展示面：Mock 数据，不用于制作。

## 本地运行

```bash
python3 -m http.server 4173
```

访问 <http://localhost:4173/>。

完整 MVP 规则见 [docs/MVP_PRODUCT_DECISIONS.md](docs/MVP_PRODUCT_DECISIONS.md)，架构见 [docs/PRODUCT_TECH_ARCHITECTURE.md](docs/PRODUCT_TECH_ARCHITECTURE.md)。
