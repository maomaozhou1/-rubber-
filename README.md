# **橡胶黏弹性实验室 (Rubber Viscoelasticity Lab)**

<div align="center">
  <p><strong>一个基于 React + Three.js 的交互式 3D 橡胶力学机理可视化教学平台</strong></p>
  <p>
    <a href="https://github.com/maomaozhou1/-rubber-">项目地址</a> •
    <a href="演示文档.md">演示文档</a> •
    <a href="公众号文章.md">公众号宣传</a>
  </p>
</div>

---

## **项目简介**

**橡胶黏弹性实验室** 是一个专为高分子物理与材料科学教学设计的在线实验室。它通过 3D 仿真和动态数据图表，将晦涩难懂的橡胶**黏弹性（Viscoelasticity）**理论转化为直观、可操作的交互体验。

橡胶既具有固体的弹性（能量存储），又具有液体的黏性（能量耗散）。本项目旨在通过分子级视角与宏观力学模型的结合，帮助用户深入理解橡胶在不同受力条件下的动态响应。

---

## **核心功能**

### **1. 双重仿真视角**
- **分子视角 (Molecular Mode)**：可视化硫化橡胶的**熵弹性**机理。红色球体代表**交联点 (Cross-links)**，直观展示它们如何防止分子链永久滑移并赋予橡胶形状记忆。
- **力学视角 (Mechanical Mode)**：利用弹簧（Spring）与阻尼器（Dashpot）的物理组合，模拟宏观力学响应。

### **2. 经典力学模型全覆盖**
实验室支持多种经典流变学模型：
- **Maxwell 模型**：模拟黏弹性流体（生胶）。
- **Kelvin-Voigt 模型**：模拟受限的黏弹性固体（避震橡胶）。
- **标准线性固体 (SLS) 模型**：包含 Maxwell 和 Kelvin 两种形式，最贴近硫化橡胶的真实表现。
- **广义 Maxwell 模型 (Prony 级数)**：多级松弛分析，支持高精度科研模拟。

### **3. 动态响应曲线**
实时绘制**应力（Stress）**与**应变（Strain）**随时间变化的动态图表。
- **蠕变实验 (Creep)**：观察恒定应力下应变的滞后增长。
- **松弛实验 (Relaxation)**：观察恒定应变下应力的指数级衰减。

---

## **技术栈**

- **前端框架**: React 19
- **3D 渲染**: Three.js (@react-three/fiber, @react-three/drei)
- **动态图表**: Recharts
- **样式与 UI**: Tailwind CSS, Lucide Icons
- **物理动画**: 原生稳定循环 (使用 `useRef` 与 `setInterval` 优化)

---

## **本地运行指南**

### **1. 克隆并安装依赖**
```bash
git clone https://github.com/maomaozhou1/-rubber-.git
cd rubber-viscoelasticity-lab
npm install
```

### **2. 启动开发服务器**
```bash
npm run dev
```
默认在 [http://localhost:3010/](http://localhost:3010/) 运行。

### **3. 构建生产版本**
```bash
npm run build
```

---

## **项目文档**

为了方便用户使用与教学，本项目附带了详尽的配套文档：
- **[演示文档.md](演示文档.md)**：包含全模型的数学推导、计算示例及详细分析。
- **[公众号文章.md](公众号文章.md)**：一份为您准备好的科普推文草案。
- **[部署指南.md](部署指南.md)**：指导如何将项目部署到 Vercel, Netlify 或自有服务器。

---

## **开发者说**

本实验室的开发初衷是降低科学知识的传播门槛。如果您对项目感兴趣，欢迎查看源码、提出 Issue 或参与二次开发。

*相关项目链接：[Google AI Studio 预览](https://ai.studio/apps/52087f21-ad9c-47b2-a922-88c973134146)*
