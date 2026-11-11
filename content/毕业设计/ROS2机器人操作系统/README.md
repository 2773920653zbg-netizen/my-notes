# ROS 2 毕业设计学习笔记包

主文件：`ROS2_机器人操作系统_详细学习笔记.md`

## 使用方法

1. 请将整个文件夹解压到本地。
2. 用 VS Code（推荐安装 Markdown + Math 插件）、Typora 或 Obsidian 打开 `.md` 文件。
3. 不要只单独移动 Markdown 文件；它引用的插图位于同级 `images/` 文件夹中。
4. 公式使用标准 Markdown 数学语法：行内 `$...$`，独立公式 `$$...$$`。
5. 如果公式不渲染，请检查编辑器是否开启 LaTeX/MathJax 数学公式支持。

## 目录结构

```text
ROS2_毕业设计学习笔记/
├── README.md
├── ROS2_机器人操作系统_详细学习笔记.md
└── images/
    ├── 01_system_overview.png
    ├── 02_system_architecture.png
    ├── 03_bimanual_node_graph.png
    ├── ...
    └── 15_colcon_workspace.png
```

笔记以双臂 Franka、RGB-D 相机、VLA 推理和衣物折叠为应用背景。安装命令、软件版本和真实机器人控制参数必须根据实验室实际硬件、驱动和导师要求确认。
