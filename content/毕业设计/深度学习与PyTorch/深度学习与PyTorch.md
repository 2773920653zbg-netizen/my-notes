# 深度学习与 PyTorch 学习笔记

> **面向课题：基于 VLA 模型的双臂机器人衣物折叠系统设计与实现**  
> **适用对象：自动化专业本科生**  
> **学习定位：从神经网络基础、数学原理，到 PyTorch 编程、模型训练、视觉语言融合与机器人示范数据微调。**

---

## 阅读说明

这份笔记不是只介绍深度学习名词，而是希望你真正理解以下问题：

1. 神经网络为什么能够从数据中学习？
2. 模型中的参数是什么，损失函数和梯度又是什么？
3. 反向传播为什么可以计算每个参数应该如何调整？
4. CNN、Transformer、视觉编码器和多模态模型分别负责什么？
5. PyTorch 如何把数学公式变成可运行的程序？
6. 如何把 RGB 图像、机器人状态、语言指令和动作轨迹组织成训练数据？
7. 如何使用预训练模型、迁移学习和 LoRA，使模型适配衣物折叠任务？

**与你的毕业设计直接相关的重点：** 视觉特征提取、Transformer、自监督/监督训练的基本思想、模仿学习、连续动作回归、数据集构建、预训练模型微调和训练评估。

**不要求你在本科毕设阶段完成的事情：** 从零训练一个数十亿参数的视觉语言模型；完整复现大型 VLA 的预训练；把神经网络直接作为高频底层力矩控制器。你的合理路线是理解核心原理，熟练使用 PyTorch，能够部署并适配开源模型，再通过经过验证的机器人控制层执行动作。

### 公式显示约定

所有公式均使用标准 LaTeX 的 `$$ ... $$` 块级写法。建议使用支持 MathJax 或 KaTeX 的 Markdown 阅读器，例如 Typora、Obsidian、VS Code 的 Markdown 数学插件或 GitHub 的数学公式渲染功能。若某个预览器不显示公式，先检查阅读器是否启用了数学公式渲染，而不是立即认定公式本身有问题。

### 本文目录

- [第 1 章：深度学习在本课题中的位置](#第-1-章深度学习在本课题中的位置)
- [第 2 章：数学基础](#第-2-章数学基础)
- [第 3 章：神经网络基础](#第-3-章神经网络基础)
- [第 4 章：损失函数](#第-4-章损失函数)
- [第 5 章：反向传播与梯度下降](#第-5-章反向传播与梯度下降)
- [第 6 章：优化器与训练技巧](#第-6-章优化器与训练技巧)
- [第 7 章：模型泛化与过拟合](#第-7-章模型泛化与过拟合)
- [第 8 章：卷积神经网络 CNN](#第-8-章卷积神经网络-cnn)
- [第 9 章：序列建模与 Transformer](#第-9-章序列建模与-transformer)
- [第 10 章：视觉语言多模态学习](#第-10-章视觉语言多模态学习)
- [第 11 章：模仿学习与机器人动作预测](#第-11-章模仿学习与机器人动作预测)
- [第 12 章：迁移学习、微调与 LoRA](#第-12-章迁移学习微调与-lora)
- [第 13 章：PyTorch 入门与核心机制](#第-13-章pytorch-入门与核心机制)
- [第 14 章：PyTorch 数据处理](#第-14-章pytorch-数据处理)
- [第 15 章：用 PyTorch 实现训练流程](#第-15-章用-pytorch-实现训练流程)
- [第 16 章：面向衣物操作的策略网络实例](#第-16-章面向衣物操作的策略网络实例)
- [第 17 章：训练排错与实验管理](#第-17-章训练排错与实验管理)
- [第 18 章：与你的 VLA 毕设如何衔接](#第-18-章与你的-vla-毕设如何衔接)
- [第 19 章：学习计划与阶段验收](#第-19-章学习计划与阶段验收)
- [第 20 章：自测题与常见误区](#第-20-章自测题与常见误区)
- [附录：术语表、公式表与参考资料](#附录术语表公式表与参考资料)

---

# 第 1 章：深度学习在本课题中的位置

## 1.1 从传统程序到机器学习

传统程序通常由人明确编写规则：输入数据经过一组固定逻辑，得到输出。例如，使用阈值分割判断桌面上某个颜色区域是否为衣物。规则由开发者给定，程序不会因为“见过更多衣物”就自动改变算法。

机器学习则从样本中估计规则。开发者提供训练样本和目标，让模型调整参数，使模型对训练样本的预测逐渐接近目标。深度学习是机器学习的一类方法，它使用多层神经网络学习数据表示和输入到输出的映射。

在你的课题中，可以把问题写成：

- 输入：相机图像、语言指令、机器人当前状态。
- 输出：机器人下一步的目标动作，或一段未来动作序列。
- 学习目标：让模型在训练示范中学习“什么场景下应该执行什么动作”。

## 1.2 从数据到动作的训练闭环

![深度学习训练闭环](images/01_深度学习训练闭环.png)

神经网络训练的核心闭环为：

1. 准备输入数据和目标标签。
2. 模型执行前向传播，产生预测值。
3. 损失函数比较预测值与目标值。
4. 反向传播计算损失对参数的梯度。
5. 优化器根据梯度更新参数。
6. 重复训练，并在独立验证数据上检查效果。

训练的重点并不是“把程序运行很多遍”，而是保证数据、模型、损失、梯度和优化器之间的关系正确。

## 1.3 深度学习与机器人系统的边界

深度学习模型可以学习感知、分类、特征提取、动作预测和任务条件策略，但机器人真实执行还需要处理坐标变换、运动学、碰撞、安全约束、控制频率和通信延迟。

因此你的系统可以分成两个层面：

| 层面 | 主要职责 | 典型技术 |
|---|---|---|
| 学习层 | 从图像、语言和示范中预测任务动作 | CNN、Transformer、VLA、PyTorch |
| 机器人执行层 | 将动作变成安全、可执行的运动命令 | ROS2、Franka接口、MoveIt2、轨迹控制 |

模型输出不能跳过检查就直接发给真实机械臂。至少需要检查动作维度、单位、坐标系、范围、速度、碰撞和控制器状态。

## 1.4 你应该掌握的学习层知识地图

![VLA数据流](images/06_VLA数据流.png)

在这条链路中：

- 视觉编码器把图像转成视觉特征。
- 文本编码器把语言指令转成文本特征。
- 多模态融合模块建立图像与指令之间的联系。
- 动作头把融合特征转成离散动作 Token、连续动作或动作序列。
- 机器人适配层把模型动作转换成指定机器人能够执行的目标。

本笔记将先讲神经网络、CNN、Transformer 和 PyTorch，再介绍如何把它们组合成面向机器人示范数据的训练流程。

---

# 第 2 章：数学基础

深度学习并不要求一开始就掌握很高深的数学，但必须理解向量、矩阵、导数、链式法则、概率和统计。否则看见损失函数、梯度和 Attention 时容易只记住符号，而不知道它们在做什么。

## 2.1 标量、向量与矩阵

**标量**是一个数，例如温度、损失值或一个关节角。

**向量**是一组有顺序的数，例如机器人末端位置、关节状态和网络输入特征。

$$
\mathbf{x}=\begin{bmatrix}x_1\\x_2\\\vdots\\x_n\end{bmatrix}
$$

**矩阵**是由多行多列元素组成的二维数组。神经网络中的权重通常表示为矩阵。

$$
W=\begin{bmatrix}
w_{11}&w_{12}&\cdots&w_{1n}\\
w_{21}&w_{22}&\cdots&w_{2n}\\
\vdots&\vdots&\ddots&\vdots\\
w_{m1}&w_{m2}&\cdots&w_{mn}
\end{bmatrix}
$$

### 矩阵乘法的形状规则

如果矩阵 A 的形状是 `m × n`，矩阵 B 的形状是 `n × k`，则乘积 AB 的形状是 `m × k`。中间维度必须相同。

$$
A_{m\times n}B_{n\times k}=C_{m\times k}
$$

例如：输入特征有 8 个，隐藏层有 32 个神经元，则权重矩阵可以是 `32 × 8`，偏置向量是 32 维。单个样本的线性变换为：

$$
\mathbf{z}=W\mathbf{x}+\mathbf{b}
$$

如果一次输入 B 个样本，通常将样本排成矩阵：

$$
X\in\mathbb{R}^{B\times n},\quad W\in\mathbb{R}^{n\times m},\quad Z=XW+b
$$

这里的 B 是 batch size，即一个批次包含的样本数。

## 2.2 导数：参数改变一点，输出会改变多少

假设函数为：

$$
y=f(x)=x^2
$$

它的导数为：

$$
\frac{dy}{dx}=2x
$$

导数描述函数在某个点附近的变化率。深度学习关心的是：模型参数改变一点，损失会变化多少。

假设模型有参数 w，损失是 L(w)，那么：

$$
\frac{dL}{dw}
$$

就是损失对 w 的梯度。若梯度为正，沿负梯度方向减小 w 通常可以让局部损失下降；若梯度为负，则负梯度方向会增大 w。

## 2.3 偏导数与梯度

当函数有多个变量时，例如：

$$
f(x,y)=x^2+3xy+y^2
$$

对 x 求偏导时，把 y 看成常数；对 y 求偏导时，把 x 看成常数。

$$
\frac{\partial f}{\partial x}=2x+3y
$$

$$
\frac{\partial f}{\partial y}=3x+2y
$$

梯度是所有偏导数组成的向量：

$$
\nabla f=\begin{bmatrix}\frac{\partial f}{\partial x}\\\frac{\partial f}{\partial y}\end{bmatrix}
$$

神经网络参数很多，梯度也由大量偏导数组成。PyTorch 的自动微分就是帮助我们高效计算这些导数。

## 2.4 链式法则：反向传播的数学基础

假设变量 z 由 y 决定，y 又由 x 决定：

$$
z=f(y),\quad y=g(x)
$$

则 z 对 x 的导数为：

$$
\frac{dz}{dx}=\frac{dz}{dy}\frac{dy}{dx}
$$

直观理解：x 影响 y，y 再影响 z；x 对 z 的总影响，需要把这两段影响相乘。

深度神经网络是一层接一层的函数复合，因此可以反复使用链式法则，把最终损失的梯度从输出层传回前面的层。

## 2.5 概率基础

分类模型通常输出类别概率。假设一个模型认为图像属于三类的概率为：

$$
\mathbf{p}=[0.1,0.7,0.2]
$$

三个概率之和为 1。Softmax 常用于把任意实数分数转换为概率分布。

$$
p_i=\frac{e^{z_i}}{\sum_{j=1}^{C}e^{z_j}}
$$

其中 C 是类别数，z 是模型输出的 logits。注意：CrossEntropyLoss 通常要求输入 logits，而不是你提前计算好的 Softmax 概率。

## 2.6 均值、方差和标准化

均值衡量数据的中心位置：

$$
\mu=\frac{1}{N}\sum_{i=1}^{N}x_i
$$

方差衡量数据围绕均值的分散程度：

$$
\sigma^2=\frac{1}{N}\sum_{i=1}^{N}(x_i-\mu)^2
$$

标准化常写成：

$$
x'=\frac{x-\mu}{\sigma+\epsilon}
$$

其中 ε 是防止除零的小常数。

在你的机器人任务中，不同动作维度单位可能不同，例如位置单位是米，旋转单位可能是弧度，夹爪开合可能是归一化值。若不进行合理尺度处理，数值范围大的维度可能主导训练损失。

**实践原则：** 用训练集计算归一化参数，再将同一组参数应用于验证集、测试集和部署阶段。不要用测试集统计量参与训练预处理。

---

# 第 3 章：神经网络基础

## 3.1 一个神经元在做什么

最简单的神经元先对输入进行加权求和，再通过激活函数：

$$
z=\mathbf{w}^T\mathbf{x}+b
$$

$$
a=\phi(z)
$$

- x：输入特征。
- w：权重，决定每个输入特征的影响大小。
- b：偏置，调整线性变换的阈值。
- φ：激活函数。
- a：神经元输出。

如果没有激活函数，多层线性变换叠加后仍然等价于一个线性变换。因此，非线性激活函数是深层神经网络表示复杂关系的重要原因。

## 3.2 多层感知机 MLP

![MLP 神经网络结构](images/02_MLP神经网络结构.png)

一个简单 MLP 可以由输入层、若干隐藏层和输出层组成。

第一层：

$$
\mathbf{z}^{(1)}=W^{(1)}\mathbf{x}+\mathbf{b}^{(1)}
$$

$$
\mathbf{h}^{(1)}=\phi(\mathbf{z}^{(1)})
$$

第二层：

$$
\mathbf{z}^{(2)}=W^{(2)}\mathbf{h}^{(1)}+\mathbf{b}^{(2)}
$$

输出层：

$$
\hat{\mathbf{y}}=g(\mathbf{z}^{(2)})
$$

其中 y 是真实目标，ŷ 是模型预测。

### 网络到底学到了什么？

训练过程中，网络不断调整 W 和 b，使预测更接近目标。隐藏层并不一定对应人类能直接命名的特征，但它们可以逐渐形成对任务有用的内部表示。

例如在衣物操作中，视觉编码器可能形成对边缘、角点、褶皱、织物区域和空间布局有用的表示；后续融合模块再结合语言指令和机器人状态预测动作。

## 3.3 常见激活函数

### Sigmoid

$$
\sigma(x)=\frac{1}{1+e^{-x}}
$$

输出范围是 0 到 1，常用于二分类概率输出。其导数为：

$$
\sigma'(x)=\sigma(x)(1-\sigma(x))
$$

缺点：输入绝对值很大时，函数容易饱和，梯度接近 0。

### Tanh

$$
\tanh(x)=\frac{e^x-e^{-x}}{e^x+e^{-x}}
$$

输出范围是 -1 到 1。它以 0 为中心，但在输入绝对值很大时也会饱和。

### ReLU

$$
\operatorname{ReLU}(x)=\max(0,x)
$$

优点是计算简单，正区间梯度稳定；缺点是某些神经元可能长期输出 0，形成“死亡 ReLU”。

### GELU

$$
\operatorname{GELU}(x)=x\Phi(x)
$$

其中 Φ 是标准正态分布的累积分布函数。GELU 常见于 Transformer 类网络。

### 如何选择？

- 普通 MLP/CNN 隐藏层：ReLU 或 GELU 都常见。
- Transformer：常见 GELU 或其变体，具体看模型实现。
- 二分类输出：通常把 logits 交给 BCEWithLogitsLoss，不要重复手动做 Sigmoid。
- 多分类输出：通常把 logits 交给 CrossEntropyLoss，不要重复手动做 Softmax。
- 连续机器人动作：输出头通常不需要 Softmax；可以直接输出归一化连续值，或按模型设计使用其他动作分布。

## 3.4 输出层应与任务匹配

| 任务 | 输出形式 | 常用损失 |
|---|---|---|
| 二分类 | 一个 logit | BCEWithLogitsLoss |
| 多分类 | C 个 logits | CrossEntropyLoss |
| 连续数值回归 | 实数向量 | MSELoss / SmoothL1Loss |
| 机器人动作回归 | 动作向量或动作序列 | MSE / Huber / 模型特定损失 |
| 像素分割 | 每像素类别 logits | CrossEntropy / Dice 等组合 |

你的课题如果要预测双臂的连续动作，动作头通常输出多维连续变量。动作表示必须与真实执行接口匹配：关节位置、关节增量、末端位置增量、姿态表示、夹爪状态和动作时间跨度不能混为一谈。

---

# 第 4 章：损失函数

损失函数负责把“预测得好不好”转化为一个可优化的数值。损失函数选择错了，网络即使正常训练，也可能在优化错误目标。

## 4.1 均方误差 MSE

适合连续数值回归。设预测为 ŷ，真实值为 y：

$$
L_{MSE}=\frac{1}{N}\sum_{i=1}^{N}(\hat y_i-y_i)^2
$$

特点：对较大的误差惩罚更重；但异常值可能对总体损失产生很大影响。

导数：

$$
\frac{\partial L_{MSE}}{\partial \hat y_i}=\frac{2}{N}(\hat y_i-y_i)
$$

如果某个预测动作离示范动作很远，它会产生较大的梯度，推动模型修正。

## 4.2 平均绝对误差 MAE

$$
L_{MAE}=\frac{1}{N}\sum_{i=1}^{N}|\hat y_i-y_i|
$$

相较 MSE，MAE 对大误差没有平方放大，因而对离群值更稳健。但在误差为 0 的位置不可导，实际优化通常使用次梯度。

## 4.3 Huber / Smooth L1 Loss

Huber 损失在小误差时近似平方损失，在大误差时近似绝对值损失：

$$
L_\delta(e)=\begin{cases}
\frac{1}{2}e^2,& |e|\leq \delta\\
\delta(|e|-\frac{1}{2}\delta),& |e|>\delta
\end{cases}
$$

其中 e 是预测误差，δ 控制两段的切换阈值。它在机器人动作回归中值得尝试，但不能保证一定优于 MSE，需要通过验证集比较。

## 4.4 二分类交叉熵

真实标签 y 为 0 或 1，模型预测概率为 p：

$$
L_{BCE}=-\frac{1}{N}\sum_{i=1}^{N}\left[y_i\log p_i+(1-y_i)\log(1-p_i)\right]
$$

BCEWithLogitsLoss 接收 logits，并在内部以数值稳定的方式结合 Sigmoid 和 BCE。

## 4.5 多分类交叉熵

对于 C 个类别，真实类别为 y，模型给出的类别概率为 p：

$$
L_{CE}=-\log p_y
$$

对一个批次求平均：

$$
L_{CE}=-\frac{1}{N}\sum_{i=1}^{N}\log p_{i,y_i}
$$

### 为什么 PyTorch 的 CrossEntropyLoss 输入 logits？

因为 PyTorch 在损失内部进行 LogSoftmax 和负对数似然计算，数值上更稳定。直接把 Softmax 后的概率输入 CrossEntropyLoss 通常是错误用法。

## 4.6 机器人动作损失

假设模型输出动作向量：

$$
\hat{a}_t=[\Delta x,\Delta y,\Delta z,\Delta r,\Delta p,\Delta y,g]
$$

真实动作是 a_t。最简单的动作回归损失为：

$$
L_{action}=\frac{1}{B}\sum_{i=1}^{B}\|\hat a_i-a_i\|_2^2
$$

注意上面的符号只是一个可能的末端动作表示示例。不同模型可能采用绝对位姿、相对位姿、关节量、离散动作 Token 或动作块。必须先确认模型使用的动作定义、坐标系、单位、旋转参数化和归一化方法。

### 多维动作的加权损失

如果不同动作维度的重要性不同，可以构造：

$$
L=\sum_{j=1}^{D}\lambda_j L_j
$$

其中 λ_j 是第 j 个动作维度的权重。权重不能凭感觉随意设置，应该基于单位尺度、任务要求和验证结果确定。

## 4.7 训练损失低，动作一定好吗？

不一定。模型可能在离线数据上预测接近示范动作，但机器人实际执行时会产生误差，下一时刻看到的场景也可能偏离训练分布。这是模仿学习中重要的分布偏移问题。

因此：

- 离线验证损失用于检查模型对保留样本的拟合情况。
- 动作误差用于衡量预测是否接近示范动作。
- 真实机器人成功率用于衡量整套系统是否完成任务。
- 失败类型分析用于解释系统为什么失败。

不能用一个训练 loss 代替所有实验指标。

---

# 第 5 章：反向传播与梯度下降

## 5.1 前向传播与反向传播

![反向传播链式法则](images/03_反向传播链式法则.png)

前向传播：给定输入，按网络结构计算预测值和损失。

反向传播：从损失开始，利用链式法则计算每层参数的梯度。

优化器：读取这些梯度，真正更新参数。

请区分：`loss.backward()` 负责计算梯度；`optimizer.step()` 负责更新参数。两者不是一件事。

## 5.2 两层网络的反向传播推导

考虑一个简单网络：

$$
z_1=W_1x+b_1
$$

$$
h=f(z_1)
$$

$$
z_2=W_2h+b_2
$$

$$
\hat y=g(z_2)
$$

损失为：

$$
L=L(\hat y,y)
$$

为了便于推导，先把输出层的梯度记为：

$$
\delta_2=\frac{\partial L}{\partial z_2}
$$

由于 z2 = W2 h + b2：

$$
\frac{\partial L}{\partial W_2}=\delta_2 h^T
$$

$$
\frac{\partial L}{\partial b_2}=\delta_2
$$

损失对隐藏层输出 h 的梯度为：

$$
\frac{\partial L}{\partial h}=W_2^T\delta_2
$$

再考虑 h = f(z1)：

$$
\delta_1=\frac{\partial L}{\partial z_1}=\left(W_2^T\delta_2\right)\odot f'(z_1)
$$

这里 ⊙ 表示逐元素相乘。于是：

$$
\frac{\partial L}{\partial W_1}=\delta_1x^T
$$

$$
\frac{\partial L}{\partial b_1}=\delta_1
$$

这就是一个简单两层网络的反向传播结构。更深的网络只是把这个过程逐层重复。

## 5.3 Softmax + 交叉熵的常见梯度结果

对于多分类任务，若输出层 logits 为 z，Softmax 概率为 p，真实标签使用 one-hot 向量 y，则交叉熵对 logits 的梯度具有简洁形式：

$$
\frac{\partial L}{\partial z}=p-y
$$

这也是深度学习框架实现分类损失时常见的高效计算形式。

## 5.4 梯度下降

最基本的梯度下降更新公式为：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta L(\theta_t)
$$

- θ：模型参数。
- η：学习率。
- ∇L：损失对参数的梯度。

学习率太大，更新可能跨过较优区域甚至发散；学习率太小，训练会很慢，也可能长时间停在较差的区域。

## 5.5 Batch、Iteration、Epoch 的区别

- Sample：一个样本。
- Batch：一次送入模型的一批样本。
- Iteration / Step：处理一个 Batch 并完成一次参数更新。
- Epoch：训练集被完整遍历一次。

如果训练集有 1000 个样本，batch size 为 100，且没有丢弃最后一个不足批次的数据，那么每个 Epoch 通常有 10 次更新。

注意：Epoch 数量不等于参数更新次数。比较实验时要同时记录 Epoch、Step、有效训练样本数和训练时间。

---

# 第 6 章：优化器与训练技巧

## 6.1 SGD

随机梯度下降使用一个批次估计整体梯度，并更新参数：

$$
\theta_{t+1}=\theta_t-\eta g_t
$$

其中 g_t 是当前批次计算得到的梯度估计。

优点：简单、直观、内存需求相对低。缺点：对学习率较敏感，训练速度可能较慢。

## 6.2 Momentum

Momentum 为梯度引入累积方向：

$$
v_t=\beta v_{t-1}+g_t
$$

$$
\theta_{t+1}=\theta_t-\eta v_t
$$

它可以减小某些方向上更新的震荡，并在梯度方向较一致时加速优化。

## 6.3 Adam

Adam 同时维护梯度的一阶矩估计和二阶矩估计：

$$
m_t=\beta_1m_{t-1}+(1-\beta_1)g_t
$$

$$
v_t=\beta_2v_{t-1}+(1-\beta_2)g_t^2
$$

进行偏差修正：

$$
\hat m_t=\frac{m_t}{1-\beta_1^t},\quad \hat v_t=\frac{v_t}{1-\beta_2^t}
$$

更新：

$$
\theta_{t+1}=\theta_t-\eta\frac{\hat m_t}{\sqrt{\hat v_t}+\epsilon}
$$

直观理解：Adam 为不同参数自适应调整更新尺度，通常是深度学习实验的常用起点。

## 6.4 AdamW

AdamW 将权重衰减与 Adam 的梯度自适应更新解耦，常用于 Transformer 和预训练模型微调。

实践中不需要手工推导每个张量的更新过程，但要理解以下超参数：

- `lr`：学习率。
- `betas`：一阶和二阶矩估计的平滑系数。
- `eps`：数值稳定项。
- `weight_decay`：权重衰减强度。

## 6.5 学习率调度

训练过程中可以动态改变学习率。常见策略：

- StepLR：每隔固定轮数降低学习率。
- Cosine Annealing：按余弦曲线逐渐下降。
- Warmup：前期从较小学习率逐渐升高。
- ReduceLROnPlateau：验证指标长时间不改善时降低学习率。

对预训练 Transformer 微调时，Warmup + 衰减策略较常见，但具体方案要遵循选用模型的官方训练配置并通过实验验证。

## 6.6 梯度裁剪

当梯度过大时，可以按梯度范数进行裁剪：

$$
g'=g\cdot\min\left(1,\frac{c}{\|g\|_2}\right)
$$

其中 c 为最大梯度范数。它可以缓解梯度爆炸，但不能修复错误的数据、错误的损失或模型结构问题。

## 6.7 正则化与权重衰减

正则化通过限制模型复杂度或训练行为，缓解过拟合。L2 正则化的典型形式为：

$$
L_{total}=L_{data}+\lambda\|W\|_2^2
$$

注意不同框架和优化器中“L2 正则化”和“解耦权重衰减”的实现存在差别。使用 AdamW 时，应理解其 weight decay 语义，不要把所有实现都简单看成完全相同。

---

# 第 7 章：模型泛化与过拟合

## 7.1 什么是过拟合

过拟合是模型过度适应训练数据中的细节甚至噪声，导致训练表现很好，但面对没有参与训练的新样本时表现变差。

![训练与验证损失示意](images/08_过拟合曲线.png)

- 训练损失持续下降，验证损失也下降：通常是较正常的学习过程。
- 训练损失下降，验证损失开始上升：可能出现过拟合。
- 训练和验证损失都很高：可能欠拟合、模型容量不足、训练不足或数据/标签存在问题。

## 7.2 训练集、验证集和测试集

- 训练集：用于更新模型参数。
- 验证集：用于调超参数、选模型、早停。
- 测试集：最终用于相对客观地报告模型表现。

不要反复根据测试集结果调整模型，否则测试集实际上已经参与了模型选择。

## 7.3 机器人数据划分的特别注意

如果一段完整演示视频被切成几百帧，随机把帧打散到训练集和测试集，可能让相邻帧同时出现在不同集合中。因为相邻帧极其相似，测试结果会虚高。

**更合理的划分方式：** 按 Episode、演示轨迹、衣物实例、场景或采集日期分组，再划分训练/验证/测试集。要确保测试集包含真正未参与训练的轨迹或场景。

## 7.4 常见缓解方法

### 数据增强

- 随机裁剪、缩放、轻微亮度变化。
- 对视觉任务进行适度颜色抖动。
- 对深度数据进行与传感器噪声相符的增强。

机器人任务要格外谨慎：图像增强必须与标签动作保持几何一致。例如水平翻转图像后，左右臂身份、坐标系和动作方向可能都需要变换。如果只翻转图像、不变换动作标签，就会制造错误训练样本。

### Dropout

训练时随机将部分神经元输出置零，减少网络对特定神经元的依赖。推理时会自动关闭 Dropout（前提是正确调用 `model.eval()`）。

### Batch Normalization / Layer Normalization

通过归一化中间特征，帮助训练稳定。CNN 常见 BatchNorm，Transformer 常见 LayerNorm 或 RMSNorm。具体使用方式由网络架构决定。

### Early Stopping

当验证指标在若干轮内没有改善时停止训练，并保留验证表现最好的模型。

## 7.5 数据质量比盲目增大模型更重要

对机器人模仿学习而言，错误的动作时间戳、相机和机器人状态未同步、动作坐标系混乱、失败示范没有标注，都可能让模型学到相互矛盾的映射。

模型大不等于效果好。对于样本有限的毕业设计，先把数据定义、采集和验证做正确，通常比直接扩大模型参数更重要。

---

# 第 8 章：卷积神经网络 CNN

## 8.1 为什么图像常用 CNN

图像具有空间结构：相邻像素通常相关，边缘和纹理等局部模式会在不同位置重复出现。全连接网络把所有像素展开，参数量可能非常庞大；CNN 利用局部连接和卷积核权重共享，能更高效地提取空间特征。

![CNN 卷积示意](images/04_CNN卷积示意.png)

## 8.2 卷积的计算

设输入图像或特征图为 X，卷积核为 K，则某个输出位置的卷积结果可理解为对应局部区域与卷积核逐元素相乘后求和，再加偏置：

$$
Y(i,j)=\sum_{u}\sum_{v}K(u,v)X(i+u,j+v)+b
$$

一个卷积核可以学习响应某类局部模式，例如某个方向的边缘、颜色变化或纹理结构。多个卷积核形成多个输出通道。

严格来说，深度学习框架常用的是 cross-correlation 运算，但日常语境中仍通常称为卷积。

## 8.3 输出尺寸

对于二维输入，设高度 H、宽度 W、卷积核 K、填充 P、步长 S、空洞率 D，则输出尺寸的一般计算形式为：

$$
H_{out}=\left\lfloor\frac{H+2P-D(K-1)-1}{S}+1\right\rfloor
$$

$$
W_{out}=\left\lfloor\frac{W+2P-D(K-1)-1}{S}+1\right\rfloor
$$

常见术语：

- Stride：卷积核每次移动几个像素。
- Padding：边缘补零或其他填充策略。
- Kernel Size：卷积核大小。
- Channel：输入或输出特征通道数。

## 8.4 卷积层参数量

若输入通道数为 C_in，输出通道数为 C_out，卷积核尺寸为 K_h × K_w，则带偏置时参数量为：

$$
N_{param}=C_{out}(C_{in}K_hK_w+1)
$$

例如一个输入通道为 3、输出通道为 16、卷积核为 3×3 的卷积层，参数量远少于直接对大分辨率图像做全连接映射。

## 8.5 CNN 的层级表示

常见情况下，较浅层更容易学习边缘、方向和颜色变化，较深层可以组合成纹理、局部形状和更抽象的对象特征。不能把这种层级理解为每层都严格对应一个人类语义标签，它只是便于理解的概括。

## 8.6 池化与下采样

Max Pooling 取局部区域最大值，Average Pooling 取局部区域平均值。它们常用于降低特征图空间分辨率、压缩计算量。

代价是空间细节可能丢失。衣物角点、细薄边缘和精确抓取位置都需要较高空间精度，因此对于机器人抓取定位，不能不加分析地把图像特征压缩得过小。

## 8.7 ResNet 的残差连接

残差块将输入直接与某个变换结果相加：

$$
\mathbf{y}=F(\mathbf{x})+\mathbf{x}
$$

若输入和输出维度不同，需要使用投影分支匹配维度。残差连接为梯度提供较直接的传播路径，帮助训练更深的网络。

## 8.8 图像张量的常见形状

PyTorch 中批量图像最常用的布局为：

$$
X\in\mathbb{R}^{B\times C\times H\times W}
$$

- B：Batch size。
- C：通道数，RGB 图像通常为 3。
- H：图像高度。
- W：图像宽度。

例如 `torch.Size([8, 3, 224, 224])` 表示 8 张 RGB 图像，每张尺寸为 224×224。

**注意：** 有些数据存储格式采用 HWC（高、宽、通道），而 PyTorch 卷积默认使用 NCHW。输入模型之前必须确认并正确转换维度。

## 8.9 RGB-D 图像的处理

RGB-D 相机通常提供 RGB 图像和深度图。不要默认 RGB 与深度可以像普通颜色通道一样直接拼接后喂给任意预训练 RGB 网络。

常见选择：

1. RGB 使用预训练视觉编码器，Depth 使用单独编码分支，再融合特征。
2. 将深度转换为经过定义的表示，并训练或适配支持额外通道的编码器。
3. 从深度中提取点云或几何特征，与图像特征融合。

要明确深度单位、无效值、相机内参、RGB/Depth 对齐关系。深度图的归一化也应单独设计。

---

# 第 9 章：序列建模与 Transformer

## 9.1 为什么机器人动作需要序列建模

机器人操作不是一次性的图像分类，而是一个连续过程。当前动作会改变环境状态，下一时刻观察又会影响后续动作。

一段机器人轨迹可表示为：

$$
\tau=(o_1,a_1,o_2,a_2,\ldots,o_T,a_T)
$$

其中 o_t 是观察，a_t 是动作，T 是序列长度。

如果模型只输出单步动作，系统需要频繁重新观察和推理；如果模型输出一个动作块（action chunk），则可以一次预测未来若干步动作，再根据反馈重新规划。动作块长度、重规划频率和执行时长需要通过机器人实验确定。

## 9.2 从 RNN 到 Transformer

RNN 按时间顺序处理输入，当前隐藏状态依赖上一时刻状态。它适合序列数据，但长序列训练存在梯度传播困难，且传统 RNN 的时间步计算难以完全并行。

Transformer 通过注意力机制建立序列中不同位置之间的关系，不再必须依赖逐步递归的隐藏状态，因此训练时可以并行处理多个 Token。

## 9.3 Query、Key、Value 的直觉

自注意力中，每个 Token 会生成三个表示：

- Query：当前 Token 想要查询什么信息。
- Key：每个 Token 提供什么索引特征。
- Value：每个 Token 实际携带的内容。

注意力计算会比较 Query 与各个 Key 的相似程度，得到权重，再用这些权重对 Value 加权求和。

![Transformer 自注意力](images/05_Transformer自注意力.png)

## 9.4 Scaled Dot-Product Attention 推导

设输入序列经过线性映射得到 Q、K、V：

$$
Q=XW_Q,\quad K=XW_K,\quad V=XW_V
$$

其中：

$$
Q\in\mathbb{R}^{T\times d_k},\quad K\in\mathbb{R}^{T\times d_k},\quad V\in\mathbb{R}^{T\times d_v}
$$

计算每个 Query 与所有 Key 的点积：

$$
S=QK^T
$$

再除以维度缩放因子，并使用 Softmax 得到权重：

$$
A=\operatorname{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)
$$

最后对 V 加权求和：

$$
\operatorname{Attention}(Q,K,V)=AV
$$

合并得到：

$$
\operatorname{Attention}(Q,K,V)=\operatorname{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

### 为什么除以平方根维度？

当向量维度较大时，若各维近似独立、均值为 0、方差相近，点积的数值尺度会随维度增长。较大的 logits 输入 Softmax 后可能产生非常尖锐的分布，使梯度变小或训练不稳定。除以平方根维度可以缓和这种尺度增长。

## 9.5 Multi-Head Attention

单个注意力头只在一种投影子空间中进行信息交互。多头注意力将表示拆成多个头，分别进行注意力计算，再拼接和投影：

$$
\operatorname{MHA}(Q,K,V)=\operatorname{Concat}(head_1,\ldots,head_h)W_O
$$

其中每个 head 有自己的 Q、K、V 映射参数。

直观上，不同头可以学习不同的关系模式，例如不同 Token 之间的局部关系、长距离关系或跨模态信息交互。但不能简单认为每个头都对应一种清晰的人类语义功能。

## 9.6 位置编码

自注意力本身并不天然知道 Token 的先后顺序，因此 Transformer 通常需要位置编码或其他位置机制。

原始 Transformer 的正弦位置编码形式为：

$$
PE(pos,2i)=\sin\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$

$$
PE(pos,2i+1)=\cos\left(\frac{pos}{10000^{2i/d_{model}}}\right)
$$

现代 Transformer 也常用可学习位置嵌入、旋转位置编码等方式。阅读具体模型时应以它的实现为准。

## 9.7 Mask 的作用

Mask 用于限制注意力允许看到哪些位置：

- Padding Mask：不让模型把填充 Token 当作有效信息。
- Causal Mask：在自回归生成时阻止当前位置看到未来 Token。

机器人动作预测是否需要 causal mask，取决于模型是一次并行预测动作块，还是按时间自回归生成动作。

## 9.8 Vision Transformer（ViT）

ViT 将图像切分为多个 Patch，每个 Patch 展平并映射为 Token，再送入 Transformer。

若图像尺寸为 H×W，Patch 尺寸为 P×P，且可整除，则 Patch 数量为：

$$
N=\frac{H}{P}\times\frac{W}{P}
$$

每个 Patch 经线性映射获得嵌入：

$$
x_i=\operatorname{Flatten}(Patch_i)W_E
$$

再加入位置编码：

$$
z_i=x_i+PE_i
$$

ViT 可以利用全局注意力建立远距离区域的关系，但计算量和显存会受到 Token 数量影响。

## 9.9 Transformer 的计算成本直觉

标准全局自注意力的注意力矩阵大小与序列长度平方相关，常见复杂度主项为：

$$
O(T^2d)
$$

序列长度 T 增大时，注意力矩阵的显存和计算会快速增长。因此视觉图像通常需要分块策略、分辨率控制、窗口注意力或其他高效机制。

---

# 第 10 章：视觉语言多模态学习

## 10.1 什么是多模态

单模态模型只处理一种类型的信息，例如只看 RGB 图像或只处理文字。多模态模型把不同来源的信息组合起来，例如：

- 图像：桌面、衣物、夹爪位置。
- 语言：用户要求“将毛巾对折”。
- 状态：机械臂关节位置、末端位姿、夹爪状态。
- 动作：下一步移动、抓取、释放或一段动作轨迹。

在 VLA 中，视觉和语言不是独立完成任务，而是共同影响动作预测。

## 10.2 Token 是什么

Token 是模型内部处理信息的基本单元。文本 Token 通常由分词器将文本转成离散 ID；视觉 Token 可以来自图像 Patch 或视觉编码器输出；动作 Token 则是某些模型对动作进行离散化后的表示。

不同模型的 Token 定义并不相同。不能认为所有模型都将图像、语言和机器人动作编码为同一种 Token。

## 10.3 常见多模态融合方式

### 特征拼接

分别提取视觉特征和文本特征，映射到兼容维度，再拼接：

$$
h=\operatorname{Concat}(h_v,h_l)
$$

优点是结构直观；缺点是简单拼接本身不一定能充分建模跨模态关系。

### Cross-Attention

一种模态作为 Query，另一种模态提供 Key 和 Value，让一个模态能够根据另一个模态的信息选择性聚合特征：

$$
\operatorname{CrossAttn}(Q_v,K_l,V_l)=\operatorname{Softmax}\left(\frac{Q_vK_l^T}{\sqrt{d_k}}\right)V_l
$$

这里示意视觉 Query 从语言 Key/Value 中读取信息。实际网络也可能采用相反方向或双向交互。

### 统一序列建模

将图像 Token、文本 Token、机器人状态 Token 或动作 Token 放入统一 Transformer 序列中进行建模。具体排列顺序、类型嵌入、注意力掩码和输出读出方式由模型架构决定。

## 10.4 视觉语言模型与 VLA 的区别

视觉语言模型（VLM）可以回答“图像中有什么”“衣服在哪里”等问题，但不一定能输出机器人可执行的动作。

VLA 在视觉和语言条件下进一步预测动作或动作序列。它需要学习机器人动作空间，并且训练数据必须将场景观察与实际机器人动作对应起来。

## 10.5 VLA 可能采用的动作表示

不同模型可能采用：

1. 离散动作 Token：将连续动作量化为离散符号。
2. 连续动作回归：直接输出连续位置、姿态或关节变量。
3. 动作分布：预测动作概率分布，再从分布中采样或取均值。
4. 动作块：一次输出未来若干时刻的动作序列。
5. 扩散或流模型：通过生成过程得到连续动作序列。

阅读论文时重点查清：动作是绝对量还是相对量？在哪个坐标系？单位是什么？输出频率是多少？动作块包含几步？是否包含夹爪？推理输出是否需要反归一化？

---

# 第 11 章：模仿学习与机器人动作预测

## 11.1 模仿学习是什么

模仿学习让模型从专家示范中学习行为。对机器人而言，专家可能是人类通过遥操作完成抓取、拉展和折叠，系统将过程记录下来作为训练数据。

最直接的行为克隆（Behavior Cloning, BC）可以写成监督学习：

$$
D=\{(o_t,a_t)\}_{t=1}^{N}
$$

模型学习策略：

$$
\pi_\theta(a_t|o_t,l)
$$

其中 o_t 是观察，a_t 是专家动作，l 是任务语言。训练目标是让模型预测的动作接近专家动作。

## 11.2 行为克隆损失

对连续动作，最常见的基本形式是均方误差：

$$
L_{BC}=\frac{1}{N}\sum_{t=1}^{N}\|\pi_\theta(o_t,l)-a_t\|_2^2
$$

对离散动作，可以使用交叉熵损失。

如果模型预测的是动作分布，则可能通过最大似然估计优化：

$$
L_{NLL}=-\frac{1}{N}\sum_{t=1}^{N}\log p_\theta(a_t|o_t,l)
$$

## 11.3 为什么行为克隆会产生分布偏移

训练时，模型只看到专家示范中出现过的状态；部署时，模型执行自己的动作，可能产生轻微偏差。偏差会改变下一时刻的观察，后续状态可能逐渐偏离训练数据。

这意味着：一步动作预测很准，不代表长时间闭环执行一定稳定。

常见缓解办法：

- 采集覆盖更多起始状态、衣物形态和操作阶段的示范。
- 使用视觉反馈和阶段性重新规划。
- 识别失败状态并采集恢复行为。
- 设计动作块时考虑执行中重新观察的频率。
- 在仿真或受控真实实验中逐步验证，而不是直接长时间执行。

## 11.4 Action Chunking

模型可以预测未来 K 步动作，而不是只预测当前单步动作：

$$
\hat A_t=[\hat a_t,\hat a_{t+1},\ldots,\hat a_{t+K-1}]
$$

这样可以形成更连续的运动序列，减少每一步都调用大型模型的开销。但 K 太长时，执行期间环境变化可能无法及时反映；K 太短时，又可能频繁推理、动作不连贯。

## 11.5 双臂动作表示

如果左右臂均由末端位姿控制，可以先从概念上写成：

$$
a_t=[a_t^L,a_t^R,g_t^L,g_t^R]
$$

其中左右臂分别有自己的空间动作和夹爪状态。若每只手使用 7 维表示，联合动作维度可能为 14 维，但这只是某一种定义，不是所有 VLA 的默认输出格式。

你必须根据实际 Franka 接口、模型原始动作定义和数据采集程序确定最终动作向量。

## 11.6 数据必须时间对齐

![机器人示范数据时间对齐](images/09_机器人示范数据时间对齐.png)

一条训练样本不能只有图像和一个动作数组，还要清楚它们属于同一时刻或同一动作窗口。建议记录：

- 时间戳。
- RGB 图像和深度图。
- 机器人关节状态。
- 左右末端状态。
- 夹爪状态。
- 语言任务指令。
- 专家动作和动作持续时间。
- Episode ID 与成功/失败标签。

训练时要明确动作是“当前观察后的下一时刻动作”，还是“以当前时刻为起点的一段动作块”。两种定义不同，不能混用。

---

# 第 12 章：迁移学习、微调与 LoRA

## 12.1 为什么使用预训练模型

从零训练大型视觉语言模型需要大量数据和算力。迁移学习利用已经从大规模数据中学到的通用表示，再让模型适配新的任务。

例如，视觉编码器已经学会基本边缘、纹理和物体结构；下游任务只需要使其更适合衣物和机器人操作。

## 12.2 三种常见微调方式

![预训练模型微调策略](images/10_预训练模型微调策略.png)

### 方式 A：冻结主干，只训练新任务头

适合数据量小、显存有限、希望快速验证任务是否可学的阶段。

### 方式 B：全量微调

更新模型中大部分或全部参数。适应能力强，但显存、计算量和过拟合风险更高。

### 方式 C：参数高效微调

冻结大部分原始参数，只训练少量新增参数，例如 LoRA Adapter。

## 12.3 LoRA 的核心思想

设预训练权重矩阵为 W，微调时不直接更新完整 W，而是学习一个低秩更新量：

$$
W'=W+\Delta W
$$

将 ΔW 近似分解为两个较小矩阵的乘积：

$$
\Delta W=BA
$$

若 W 的形状是 d_out × d_in，选择低秩 r，则：

$$
A\in\mathbb{R}^{r\times d_{in}},\quad B\in\mathbb{R}^{d_{out}\times r}
$$

原始矩阵参数量为：

$$
N_{full}=d_{out}d_{in}
$$

LoRA 需要训练的参数量为：

$$
N_{LoRA}=r(d_{in}+d_{out})
$$

当 r 远小于输入和输出维度时，新增可训练参数会显著减少。

实践中通常还会对低秩更新乘一个缩放系数：

$$
W'=W+\frac{\alpha}{r}BA
$$

具体初始化、目标模块和缩放规则由使用的 PEFT/模型实现决定。

## 12.4 微调不等于一定提升

如果数据少、标注不一致、动作坐标系错误，微调可能降低模型泛化表现。每次微调应该保留：

- 原始预训练模型的基线结果。
- 微调前后的验证集结果。
- 训练集、验证集划分清单。
- 学习率、batch size、训练步数和随机种子。
- Adapter 权重和基础模型版本。

## 12.5 对你课题的建议顺序

1. 先能加载预训练模型并完成离线推理。
2. 检查输入图像分辨率、语言 Token 和动作格式。
3. 做一个小规模数据过拟合实验，确认训练代码链路正确。
4. 再使用合理划分的完整数据集训练。
5. 对比冻结骨干、LoRA 或模型官方建议的微调方式。
6. 最后才进入真实机器人闭环实验。

---

# 第 13 章：PyTorch 入门与核心机制

## 13.1 PyTorch 是什么

PyTorch 是张量计算和深度学习框架。它提供张量运算、自动微分、神经网络模块、优化器、数据加载和 GPU 计算等功能。

官方入门流程通常围绕 Tensor、Dataset/DataLoader、模型构建、自动微分、优化循环和模型保存展开。参考：[PyTorch Learn the Basics](https://docs.pytorch.org/tutorials/beginner/basics/intro)。

## 13.2 Tensor：PyTorch 的基本数据结构

```python
import torch

# 创建张量
x = torch.tensor([[1.0, 2.0], [3.0, 4.0]])

# 指定数据类型
y = torch.zeros(3, 4, dtype=torch.float32)

# 查看形状、类型和设备
print(x.shape)
print(x.dtype)
print(x.device)
```

Tensor 与 NumPy 数组类似，但能够参与 GPU 运算，并且可以记录梯度计算图。

## 13.3 维度、形状与索引

```python
x = torch.randn(8, 3, 224, 224)

print(x.shape)          # [8, 3, 224, 224]
print(x.ndim)           # 4
print(x.size(0))        # 8，Batch size

# 交换维度
x_hwc = x.permute(0, 2, 3, 1)

# 只改变形状，不改变元素顺序（需要满足内存布局条件）
x_flat = x.reshape(8, -1)
```

要特别区分：`view()` 和 `reshape()` 都用于调整形状，但 `view()` 对底层内存连续性要求更严格；`reshape()` 在必要时可能返回拷贝。

## 13.4 常见 Tensor 运算

```python
x = torch.randn(4, 3)
y = torch.randn(3, 2)

z = x @ y                  # 矩阵乘法
s = x + 2                  # 广播
m = x.mean(dim=0)          # 沿第 0 维求均值
n = x.norm(dim=1)          # 每一行的范数
```

### Broadcasting（广播）

广播允许不同形状的张量在兼容条件下进行逐元素运算。例如 `[B, D]` 与 `[D]` 相加时，后者会沿 batch 维扩展。

广播规则要熟悉，否则很容易出现维度虽然能运行、但语义不符合预期的错误。

## 13.5 CPU 和 GPU 设备管理

```python
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("使用设备：", device)

x = torch.randn(4, 3).to(device)
```

模型和输入张量必须位于兼容设备上：

```python
model = model.to(device)
x = x.to(device)
```

常见报错：Expected all tensors to be on the same device。通常是模型在 GPU，而某个输入、标签或临时张量仍在 CPU。

## 13.6 自动微分 Autograd

PyTorch 的 Autograd 会在前向计算时记录可微运算关系，随后通过反向模式自动微分计算梯度。官方机制说明：[Autograd mechanics](https://docs.pytorch.org/docs/stable/notes/autograd)。

```python
import torch

x = torch.tensor(2.0, requires_grad=True)
y = x ** 2 + 3 * x + 1

y.backward()

print(y.item())       # 11
print(x.grad.item())  # 7，因为 dy/dx = 2x + 3
```

这里 x=2，导数为 2×2+3=7。

## 13.7 requires_grad、grad_fn 和 backward

- `requires_grad=True`：告诉 PyTorch 需要跟踪这个张量的梯度。
- `grad_fn`：通常用于查看非叶子张量由什么运算产生。
- `backward()`：从标量损失出发执行反向传播。
- `.grad`：叶子参数累计得到的梯度。

默认情况下，梯度会累加到 `.grad`，因此每个训练批次更新前通常要清空旧梯度。

## 13.8 为什么要 optimizer.zero_grad()

```python
optimizer.zero_grad()
loss.backward()
optimizer.step()
```

如果不清空，下一批次的梯度会加到上一批次的梯度上，除非你明确想进行梯度累积。

PyTorch 推荐的完整训练顺序可参考：[Training with PyTorch](https://docs.pytorch.org/tutorials/beginner/introyt/trainingyt)。

## 13.9 no_grad 与 inference_mode

评估和推理时通常不需要计算梯度：

```python
model.eval()
with torch.no_grad():
    prediction = model(x)
```

较新版本也提供 `torch.inference_mode()`，用于更严格地关闭推理计算图相关开销。训练时不要错误地把前向传播放在 no_grad 中，否则参数无法通过这一段计算得到梯度。

## 13.10 nn.Module

PyTorch 的模型通常继承 `torch.nn.Module`。

```python
import torch
from torch import nn

class SimpleMLP(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int, output_dim: int):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

model = SimpleMLP(input_dim=10, hidden_dim=64, output_dim=4)
```

`__init__()` 定义模型层；`forward()` 定义数据如何通过这些层。通常调用 `model(x)`，而不是手动调用 `model.forward(x)`，这样 PyTorch 的模块钩子等机制才能正常工作。

## 13.11 常用层

| 模块 | 作用 | 常用场景 |
|---|---|---|
| `nn.Linear` | 全连接线性变换 | MLP、动作头 |
| `nn.Conv2d` | 二维卷积 | 图像特征提取 |
| `nn.ReLU` | 非线性激活 | CNN/MLP |
| `nn.GELU` | 平滑激活 | Transformer |
| `nn.LayerNorm` | 层归一化 | Transformer |
| `nn.BatchNorm2d` | 批归一化 | CNN |
| `nn.Dropout` | 随机失活 | 正则化 |
| `nn.MultiheadAttention` | 多头注意力 | 序列/多模态结构 |
| `nn.Embedding` | 离散索引映射向量 | 文本 Token 等 |

---

# 第 14 章：PyTorch 数据处理

## 14.1 Dataset 与 DataLoader

`Dataset` 负责定义如何读取一个样本；`DataLoader` 负责把多个样本组装成 Batch，并支持打乱顺序、并行加载等功能。

官方教程：[Datasets & DataLoaders](https://docs.pytorch.org/tutorials/beginner/basics/data_tutorial.html)。

```python
from torch.utils.data import Dataset, DataLoader
import torch

class ToyDataset(Dataset):
    def __init__(self, x: torch.Tensor, y: torch.Tensor):
        self.x = x
        self.y = y

    def __len__(self):
        return len(self.x)

    def __getitem__(self, idx: int):
        return self.x[idx], self.y[idx]

x = torch.randn(1000, 10)
y = torch.randn(1000, 3)

dataset = ToyDataset(x, y)
loader = DataLoader(
    dataset,
    batch_size=32,
    shuffle=True,
    num_workers=0,
)

for batch_x, batch_y in loader:
    print(batch_x.shape, batch_y.shape)
    break
```

## 14.2 为什么数据代码应与模型分离

数据处理可能涉及图像读取、深度对齐、时间戳同步、动作归一化和数据增强。若将这些逻辑全部写在模型 `forward()` 里，项目会难以调试，也难以复用。

建议明确分成：

1. 原始数据读取。
2. 单样本预处理。
3. Batch 组织。
4. 模型前向计算。
5. 损失计算和更新。

## 14.3 面向机器人示范数据的 Dataset 示例

下面是一个简化的样本索引 Dataset。假设已经预处理并保存了 `.pt` 样本文件，每个文件包含 `image`、`state` 和 `action`。

```python
from pathlib import Path
from typing import Dict
import torch
from torch.utils.data import Dataset

class RobotDemoDataset(Dataset):
    def __init__(self, sample_files: list[str]):
        self.sample_files = [Path(p) for p in sample_files]

    def __len__(self) -> int:
        return len(self.sample_files)

    def __getitem__(self, index: int) -> Dict[str, torch.Tensor]:
        path = self.sample_files[index]
        sample = torch.load(path, map_location="cpu", weights_only=True)

        image = sample["image"].float()       # [3, H, W]，示例为 RGB
        state = sample["state"].float()       # [state_dim]
        action = sample["action"].float()     # [action_dim]

        return {
            "image": image,
            "state": state,
            "action": action,
        }
```

说明：

- 对可信的自有数据文件使用 `weights_only=True` 是更稳妥的加载习惯之一；具体支持情况取决于 PyTorch 版本和保存内容。
- 不要把来源不明的 `.pt` 文件当作普通数据盲目反序列化。
- 如果数据是视频、HDF5、Zarr、RLDS 或 LeRobot 格式，应使用对应的数据读取方案，不必强行转换为一个文件一个样本。

## 14.4 机器人数据 Batch 形状

假设每个 Batch 有 B 条样本：

| 字段 | 常见形状 | 说明 |
|---|---|---|
| RGB | `[B, 3, H, W]` | 图像 |
| Depth | `[B, 1, H, W]` | 深度图，若使用 |
| State | `[B, S]` | 关节、末端状态等 |
| Action | `[B, A]` | 单步动作 |
| Action Chunk | `[B, K, A]` | K 步动作块 |
| Text Token | `[B, L]` | 长度 L 的 Token ID |

视觉模型的图像尺寸、文本最大长度、动作维度和动作块长度必须与模型实现一致。

## 14.5 数据切分与归一化顺序

正确顺序：

1. 先按 Episode 或场景划分 train / val / test。
2. 只使用 train 计算均值、方差、动作上下界等统计量。
3. 使用训练集统计量处理 val 和 test。
4. 保存统计量，推理阶段必须复用。

错误做法：先对全部数据计算均值和方差，再切分训练集和测试集。这样会让测试集信息参与训练预处理，造成数据泄漏。

## 14.6 数据增强与动作标签同步

对于普通分类，图像水平翻转可能只是改变图像；对于机器人动作预测，水平翻转还可能意味着：

- 左右臂角色互换。
- 相机坐标系中的 x 方向变化。
- 目标抓取点变化。
- 关节/末端动作变换。

若无法严谨地同步变换动作标签，就不要使用这种增强。宁可使用幅度较小但语义正确的数据增强，也不要为了扩大数据量制造不一致标签。

---

# 第 15 章：用 PyTorch 实现训练流程

## 15.1 标准训练循环

![PyTorch 训练循环](images/07_PyTorch训练循环.png)

核心流程如下：

```python
for epoch in range(num_epochs):
    model.train()

    for x, y in train_loader:
        x = x.to(device)
        y = y.to(device)

        optimizer.zero_grad(set_to_none=True)
        prediction = model(x)
        loss = criterion(prediction, y)
        loss.backward()
        optimizer.step()
```

每一行的意义：

1. `model.train()`：开启训练模式，例如启用 Dropout、更新 BatchNorm 统计量。
2. 把 Batch 移动到目标设备。
3. 清理上一批次梯度。
4. 前向计算得到预测。
5. 计算损失。
6. 反向传播得到梯度。
7. 优化器更新参数。

## 15.2 一个完整、可运行的 MLP 回归训练示例

下面用人工生成的回归数据演示完整训练过程。它不是衣物操作模型，但可以先帮助你理解 PyTorch 的训练结构。

```python
import torch
from torch import nn
from torch.utils.data import TensorDataset, DataLoader


def main():
    torch.manual_seed(42)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # 构造一个简单的监督学习数据集：y = 2*x0 - 3*x1 + 0.5
    x = torch.randn(2000, 2)
    y = 2.0 * x[:, 0:1] - 3.0 * x[:, 1:2] + 0.5
    y += 0.05 * torch.randn_like(y)

    # 训练/验证划分
    x_train, x_val = x[:1600], x[1600:]
    y_train, y_val = y[:1600], y[1600:]

    train_loader = DataLoader(
        TensorDataset(x_train, y_train),
        batch_size=64,
        shuffle=True,
    )

    val_loader = DataLoader(
        TensorDataset(x_val, y_val),
        batch_size=128,
        shuffle=False,
    )

    model = nn.Sequential(
        nn.Linear(2, 64),
        nn.ReLU(),
        nn.Linear(64, 64),
        nn.ReLU(),
        nn.Linear(64, 1),
    ).to(device)

    criterion = nn.MSELoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)

    for epoch in range(30):
        model.train()
        train_sum = 0.0
        train_count = 0

        for batch_x, batch_y in train_loader:
            batch_x = batch_x.to(device)
            batch_y = batch_y.to(device)

            optimizer.zero_grad(set_to_none=True)
            pred = model(batch_x)
            loss = criterion(pred, batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()

            train_sum += loss.item() * batch_x.size(0)
            train_count += batch_x.size(0)

        model.eval()
        val_sum = 0.0
        val_count = 0
        with torch.no_grad():
            for batch_x, batch_y in val_loader:
                batch_x = batch_x.to(device)
                batch_y = batch_y.to(device)
                pred = model(batch_x)
                val_loss = criterion(pred, batch_y)
                val_sum += val_loss.item() * batch_x.size(0)
                val_count += batch_x.size(0)

        print(
            f"Epoch {epoch + 1:02d} | "
            f"train={train_sum / train_count:.6f} | "
            f"val={val_sum / val_count:.6f}"
        )

    torch.save(model.state_dict(), "mlp_regression.pt")
    print("模型参数已保存到 mlp_regression.pt")


if __name__ == "__main__":
    main()
```

## 15.3 训练模式与评估模式的区别

```python
model.train()  # 训练模式
model.eval()   # 评估/推理模式
```

两者不会自动改变模型权重，但会改变某些层的行为。例如 Dropout 在训练模式下随机失活，在评估模式下关闭；BatchNorm 在训练模式下使用当前批次统计量并更新运行统计量，在评估模式下通常使用训练期间累计的统计量。

只调用 `torch.no_grad()` 而忘记 `model.eval()`，并不能替代评估模式切换。

## 15.4 保存与加载模型

推荐保存模型参数 `state_dict`：

```python
# 保存
torch.save(model.state_dict(), "model_weights.pt")

# 加载：先重新创建同结构模型
model = SimpleMLP(input_dim=10, hidden_dim=64, output_dim=4)
state = torch.load("model_weights.pt", map_location="cpu", weights_only=True)
model.load_state_dict(state)
model.eval()
```

如果要恢复完整训练状态，还应保存优化器状态、Epoch、调度器状态、随机状态和数据归一化统计量。

## 15.5 Checkpoint 示例

```python
checkpoint = {
    "epoch": epoch,
    "model_state_dict": model.state_dict(),
    "optimizer_state_dict": optimizer.state_dict(),
    "best_val_loss": best_val_loss,
    "action_mean": action_mean,
    "action_std": action_std,
}
torch.save(checkpoint, "checkpoint.pt")
```

加载时应检查模型结构、数据维度和软件版本是否一致。不要只保存模型权重而忘记动作均值和标准差，否则部署时无法正确反归一化。

## 15.6 混合精度训练

混合精度使用部分低精度浮点计算，以节省显存并可能提高 GPU 吞吐量。常见数据类型包括 FP16 和 BF16。不同 GPU 对两者的支持和性能不同。

较新 PyTorch 版本可参考 `torch.amp` 的官方接口。概念示例：

```python
# 仅示意：请根据本机 PyTorch 版本和 GPU 支持情况确认 API。
with torch.amp.autocast(device_type="cuda", dtype=torch.float16):
    prediction = model(x)
    loss = criterion(prediction, y)
```

FP16 训练常搭配 GradScaler 缓解梯度下溢；BF16 的指数范围更大，在适合的 GPU 上可能不需要同样的缩放方式。不要在 CPU 环境中照搬 CUDA 混合精度设置。

## 15.7 梯度累积

GPU 显存不足时，可以连续对多个小 Batch 累积梯度，再执行一次优化器更新。若目标等效 Batch 为 64，每个小 Batch 为 8，则可以累积 8 次。

```python
accum_steps = 8
optimizer.zero_grad(set_to_none=True)

for step, (x, y) in enumerate(loader):
    pred = model(x)
    loss = criterion(pred, y) / accum_steps
    loss.backward()

    if (step + 1) % accum_steps == 0:
        optimizer.step()
        optimizer.zero_grad(set_to_none=True)
```

最后不足一个累积周期的 Batch 需要额外处理。梯度累积近似扩大有效 Batch，但不等同于所有 Batch 一次性并行，BatchNorm 等层的行为可能不同。

---

# 第 16 章：面向衣物操作的策略网络实例

本章把前面的知识组合起来，搭建一个简化的视觉—状态到动作的行为克隆网络。它不是完整 OpenVLA，也不是可直接控制 Franka 的完整系统；它的作用是帮助你理解图像特征、机器人状态和连续动作如何进入 PyTorch 训练流程。

## 16.1 简化问题定义

输入：

- 一张 RGB 图像。
- 一个机器人状态向量。

输出：

- 一个固定维度的连续动作向量。

暂时不引入语言指令、不引入动作序列、不引入 Transformer。先把监督学习最基本的链路跑通。

## 16.2 网络结构

1. CNN 提取图像特征。
2. MLP 提取机器人状态特征。
3. 拼接两类特征。
4. MLP 动作头预测连续动作。

```python
import torch
from torch import nn

class SimpleVisualStatePolicy(nn.Module):
    def __init__(self, state_dim: int, action_dim: int):
        super().__init__()

        self.visual_encoder = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=5, stride=2, padding=2),
            nn.ReLU(),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1)),
            nn.Flatten(),
        )

        self.state_encoder = nn.Sequential(
            nn.Linear(state_dim, 128),
            nn.ReLU(),
            nn.Linear(128, 128),
            nn.ReLU(),
        )

        self.action_head = nn.Sequential(
            nn.Linear(128 + 128, 256),
            nn.ReLU(),
            nn.Linear(256, action_dim),
        )

    def forward(self, image: torch.Tensor, state: torch.Tensor) -> torch.Tensor:
        image_feature = self.visual_encoder(image)
        state_feature = self.state_encoder(state)
        fused = torch.cat([image_feature, state_feature], dim=1)
        action = self.action_head(fused)
        return action
```

## 16.3 一个 Batch 的数据形状

```python
B = 16
image = torch.randn(B, 3, 128, 128)
state = torch.randn(B, 20)

policy = SimpleVisualStatePolicy(state_dim=20, action_dim=14)
action = policy(image, state)

print(action.shape)  # torch.Size([16, 14])
```

这里的 20 和 14 只是用于演示的维度，不代表你的 Franka 系统真实维度。真实维度由你使用的状态定义和动作接口决定。

## 16.4 训练目标

```python
criterion = nn.SmoothL1Loss()

pred_action = policy(image, state)
loss = criterion(pred_action, expert_action)
```

expert_action 必须和 pred_action 的动作定义一致，包括：

- 维度顺序。
- 单位。
- 坐标系。
- 绝对值或增量值。
- 旋转表示。
- 夹爪含义。
- 是否归一化。

只要其中任何一项不一致，网络就可能在学习一个错误映射。

## 16.5 动作归一化与反归一化

对每一维动作使用训练集均值与标准差：

$$
a' = \frac{a-\mu_a}{\sigma_a+\epsilon}
$$

模型输出后需要反归一化：

$$
\hat a=\hat a'(\sigma_a+\epsilon)+\mu_a
$$

必须把训练时的 μ_a 和 σ_a 保存下来，真实机器人推理时使用同一组统计量。

## 16.6 为什么先做简化策略网络

它能够帮助你独立验证：

- 图片读取和预处理是否正确。
- Dataset 是否能返回正确形状。
- 网络是否能前向运行。
- 损失是否能反向传播。
- 模型是否能在小数据集上过拟合到很低的训练误差。
- 模型权重能否保存与恢复。

这些问题确认后，再换成预训练视觉编码器、语言模型、Transformer 和正式 VLA 模型，会更容易定位错误。

---

# 第 17 章：训练排错与实验管理

## 17.1 常见问题诊断表

| 现象 | 可能原因 | 排查顺序 |
|---|---|---|
| loss 一直不下降 | 标签错误、学习率不合适、模型输出与目标形状不匹配 | 先检查一个 Batch，再检查梯度和学习率 |
| loss 变成 NaN | 输入有 NaN/Inf、学习率过大、数值溢出 | 检查数据、输出、梯度范数和精度 |
| 训练 loss 很低，验证 loss 很高 | 过拟合、数据划分泄漏/偏差、训练与验证分布不同 | 按 Episode 重新划分并检查数据分布 |
| CUDA out of memory | Batch、图像分辨率、模型或中间激活过大 | 减小 Batch、分辨率，启用混合精度或梯度累积 |
| 模型预测几乎是常数 | 标签尺度问题、数据多样性不足、梯度异常 | 检查归一化、标签方差、模型输出和梯度 |
| loss 下降但机器人动作不合理 | 动作维度/单位/坐标系错误，或闭环分布偏移 | 离线逐维对比，再做低风险单步验证 |
| 训练速度非常慢 | 数据读取瓶颈、CPU/GPU数据搬运、模型太大 | 分析 DataLoader、GPU利用率和数据预处理 |

## 17.2 训练开始前先做小样本过拟合测试

这是非常有价值的调试方法：只拿 8—32 条样本，反复训练模型，检查模型能否把这些样本拟合到很低的误差。

如果连很小的一批样本都拟合不了，先不要扩大训练集或增加训练时间。应优先检查：

- 模型输出维度是否正确。
- 预测值和标签是否在同一尺度。
- 损失函数是否匹配任务。
- 梯度是否存在。
- 优化器是否更新参数。
- 输入图像是否真的包含有效信息。

## 17.3 记录实验配置

每次实验至少保存：

- 实验编号。
- 代码 Git commit。
- 模型名称和预训练权重版本。
- 数据集版本与划分文件。
- 输入分辨率、状态维度、动作维度。
- Batch size、学习率、优化器、Epoch/Step。
- 随机种子。
- 训练/验证损失曲线。
- 最优 checkpoint。
- 推理耗时与显存占用。
- 真实机器人实验结果和失败原因。

## 17.4 随机种子

```python
import random
import numpy as np
import torch

seed = 42
random.seed(seed)
np.random.seed(seed)
torch.manual_seed(seed)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(seed)
```

设置随机种子有助于复现实验，但 GPU 算子、并行数据加载和不同软件环境可能仍带来非完全确定性。实验报告中应记录环境和随机种子，而不是声称只设置一个 seed 就保证所有结果完全一致。

---

# 第 18 章：与你的 VLA 毕设如何衔接

## 18.1 你真正需要把哪些知识用到项目里

| 本笔记知识 | 毕设中的用途 | 优先级 |
|---|---|---|
| Tensor / 自动微分 | 理解模型计算与训练 | 必须 |
| MLP / 损失函数 | 建立动作回归基线 | 必须 |
| CNN / ViT | 图像特征提取 | 必须理解 |
| Transformer / Attention | 理解 VLA 主干和多模态交互 | 重点 |
| Dataset / DataLoader | 组织演示数据 | 必须 |
| 优化器 / 学习率 | 微调模型 | 必须 |
| 迁移学习 / LoRA | 用有限数据适配预训练模型 | 重点 |
| 模仿学习 / BC | 从机器人示范学习动作 | 重点 |
| 混合精度 / 梯度累积 | 控制 GPU 显存和训练速度 | 按需 |
| 强化学习高级算法 | 可能用于后续拓展 | 暂不作为主线 |

## 18.2 一条实际可执行的模型路线

**阶段 A：PyTorch 基础验证**

用 MLP 拟合一个简单数值关系，理解训练循环。

**阶段 B：视觉回归基线**

用 CNN 从 RGB 图像中提取特征，预测简单抓取点或动作参数。

**阶段 C：视觉 + 状态融合**

把机器人关节/末端状态与视觉特征融合，建立行为克隆基线。

**阶段 D：序列建模**

尝试 Transformer 或动作块模型，理解多步动作预测。

**阶段 E：预训练 VLA 适配**

加载官方模型，复现推理，检查动作接口，再按模型要求整理数据和微调。

**阶段 F：闭环机器人验证**

先仿真或低风险验证，再进入真实机器人，逐步增加衣物形态、初始摆放和任务复杂度。

## 18.3 VLA 模型和普通策略网络的关系

本笔记中的 CNN + 状态 MLP 是基础监督学习模型，输入简单、输出固定维度。VLA 通常更复杂：会包含大规模预训练视觉/语言表示、多模态融合、动作 Token 或连续动作生成模块。

但底层训练逻辑仍然有相通之处：

- 输入数据要定义清楚。
- 模型输出要有明确语义。
- 损失函数要与输出类型一致。
- 反向传播和优化器负责更新参数。
- 验证集和真实实验负责评估效果。

学会基础 PyTorch 后，你就可以读懂复杂模型的训练入口、Dataset、loss、optimizer 和 checkpoint 部分，而不必一开始就理解每个模型模块的全部代码。

## 18.4 不要让 VLA 直接承担所有控制责任

在你的系统里，合理的分层思路是：

1. VLA：理解“做什么”，输出操作意图、关键目标或动作块。
2. 任务规划：拆分“先抓哪里、双臂如何配合、何时重新观察”。
3. 运动规划：检查工作空间、逆运动学、轨迹和碰撞。
4. 底层控制：按实验室接口控制机器人。
5. 安全监控：限制速度、范围、动作超时和异常状态。

模型输出必须经过适配和安全验证。不要将未经过验证的神经网络输出直接当作关节力矩或高频控制命令。

---

# 第 19 章：学习计划与阶段验收

下面按你当前毕设时间安排中的“深度学习与 PyTorch”模块拆分。实际日期可以根据课程、实验室开放时间和导师要求调整。

| 阶段 | 学习内容 | 必须完成的代码/成果 | 验收标准 |
|---|---|---|---|
| 第 1 周 | 线代、导数、链式法则、感知机和 MLP | 手写一个两层网络的前向计算 | 能解释 W、b、激活函数和参数形状 |
| 第 2 周 | 损失函数、反向传播、SGD/Adam | PyTorch 自动微分小实验 | 能解释 loss.backward 与 optimizer.step |
| 第 3 周 | Dataset、DataLoader、训练循环 | 完整 MLP 回归训练 | 能训练、验证、保存和加载模型 |
| 第 4 周 | CNN、图像预处理、过拟合与增强 | 一个小型图像分类实验 | 能解释卷积、Batch 维度和验证集 |
| 第 5 周 | Transformer、Attention、ViT | 写一个简化 Attention 模块或运行官方示例 | 能解释 Q/K/V、Softmax 和位置编码 |
| 第 6 周 | 多模态、行为克隆和动作回归 | CNN + 状态输入动作输出的基线 | 能处理图像、状态、动作三类数据 |
| 第 7 周 | 迁移学习、微调、LoRA | 运行一个预训练模型微调示例 | 能说明冻结层、可训练参数和 checkpoint |
| 第 8 周 | 结合 VLA 官方代码 | 完成目标模型的环境配置与离线推理 | 输入格式和输出动作定义清楚 |

## 19.1 每个阶段的最低验收标准

### 数学与神经网络

- 能解释前向传播和反向传播的区别。
- 能手工计算一个简单神经元输出。
- 能解释链式法则如何产生梯度。
- 能解释 MSE 与交叉熵分别适用于什么任务。

### PyTorch

- 能创建 Tensor 并理解形状。
- 能定义 `nn.Module`。
- 能写出完整训练循环。
- 能正确切换 `train()` 和 `eval()`。
- 能保存和加载 `state_dict`。

### CNN 与 Transformer

- 能说明卷积核如何滑动并产生特征图。
- 能解释 ViT 如何把图像转成 Patch Token。
- 能推导或解释 Attention 的 QK^T、Softmax 和 V 加权求和。

### 机器人示范数据

- 能把一个 Episode 的 RGB、机器人状态和动作对齐。
- 能定义动作向量每一维的含义和单位。
- 能按 Episode 划分训练、验证和测试集。
- 能完成小数据集过拟合测试。

### 预训练模型

- 能加载官方模型并完成一次推理。
- 能说清输入预处理和输出动作定义。
- 能完成一次小规模微调并保存权重。
- 能在验证集上比较微调前后的表现。

---

# 第 20 章：自测题与常见误区

## 20.1 基础概念自测

1. 为什么多层网络需要非线性激活函数？
2. 权重 W 和偏置 b 在网络中分别起什么作用？
3. 梯度表示什么？为什么沿负梯度方向更新参数？
4. 前向传播和反向传播各自完成什么工作？
5. MSE 和 CrossEntropyLoss 分别适合什么任务？
6. `loss.backward()` 与 `optimizer.step()` 有什么区别？
7. 一个 `torch.Size([16, 3, 224, 224])` 张量的四个维度分别表示什么？
8. 为什么验证集不能用于反向传播更新参数？
9. 什么是过拟合？如何从训练曲线中发现它？
10. 为什么机器人数据需要按 Episode 而不只是按帧随机划分？

## 20.2 Transformer 自测

1. Query、Key、Value 分别表示什么？
2. 为什么 Q 和 K 点积后要除以平方根维度？
3. Softmax 在注意力计算中起什么作用？
4. 多头注意力为什么需要多个头？
5. Transformer 为什么需要位置信息？
6. ViT 如何把图像转换为序列？
7. 动作块预测与单步预测有什么区别？

## 20.3 PyTorch 编程自测

1. 写一个继承 `nn.Module` 的两层 MLP。
2. 创建一个包含 500 个样本的 TensorDataset。
3. 使用 DataLoader 按 batch size=32 加载数据。
4. 写出一个训练 epoch 的完整循环。
5. 写出验证集评估代码。
6. 保存并重新加载模型参数。
7. 打印模型参数量、输入形状和输出形状。
8. 找出一段训练代码中遗漏的 `optimizer.zero_grad()`。

## 20.4 课题应用自测

1. 如果模型输出 14 维动作，如何确认每一维的含义？
2. 图像与动作的时间戳错位会造成什么后果？
3. 为什么训练集 loss 很低不代表机器人能够成功折叠？
4. 如果只对图像做水平翻转而不调整左右臂动作标签，会出现什么问题？
5. 为什么要先做传统控制基线，再做 VLA 微调？
6. 为什么模型输出需要经过动作尺度、坐标系和安全约束检查？

## 20.5 常见误区

**误区一：训练 Epoch 越多，模型越好。**  
训练过久可能导致过拟合，必须观察验证集和真实任务指标。

**误区二：只要 loss 下降，算法就正确。**  
标签、单位、坐标系和数据对齐都可能有问题，loss 下降只能说明模型在优化当前定义的目标。

**误区三：PyTorch 会自动解决所有梯度问题。**  
自动微分只负责按计算图求导，不会自动判断你的公式、标签和任务定义是不是正确。

**误区四：模型输出 7 维或 14 维就一定能控制机械臂。**  
动作语义、坐标系、单位、参考系和机器人接口必须一致。

**误区五：把验证集和测试集都用于调参没有关系。**  
反复依据测试结果改模型会造成测试集泄漏。

**误区六：微调一定比原始模型好。**  
数据质量、学习率、训练步数和动作定义都会影响微调结果，必须保留微调前基线。

---

# 附录：术语表、公式表与参考资料

## A. 常用术语表

| 英文 | 中文 | 含义 |
|---|---|---|
| Deep Learning | 深度学习 | 使用多层神经网络学习表示与映射 |
| Parameter | 参数 | 网络中通过训练更新的权重和偏置 |
| Feature | 特征 | 对输入有用的信息表示 |
| Forward Pass | 前向传播 | 从输入计算模型输出 |
| Backpropagation | 反向传播 | 通过链式法则计算梯度 |
| Gradient | 梯度 | 损失对参数的导数 |
| Loss | 损失 | 衡量预测与目标差异的函数 |
| Optimizer | 优化器 | 根据梯度更新模型参数 |
| Epoch | 训练轮数 | 完整遍历训练集一次 |
| Batch | 批次 | 一次输入模型的一组样本 |
| Overfitting | 过拟合 | 训练表现好但泛化差 |
| CNN | 卷积神经网络 | 利用卷积提取空间特征 |
| Transformer | Transformer 架构 | 使用注意力机制建模 Token 关系 |
| Attention | 注意力 | 对输入信息进行加权聚合 |
| ViT | Vision Transformer | 将图像 Patch 转为 Token 处理 |
| Fine-tuning | 微调 | 在预训练参数基础上适配任务 |
| LoRA | 低秩适配 | 用少量低秩参数进行高效微调 |
| BC | 行为克隆 | 从专家示范学习动作策略 |
| Action Chunk | 动作块 | 一次预测未来连续多个动作 |
| Checkpoint | 检查点 | 保存训练状态或模型参数 |

## B. 高频公式速查

线性变换：

$$
z=Wx+b
$$

ReLU：

$$
\operatorname{ReLU}(x)=\max(0,x)
$$

Softmax：

$$
p_i=\frac{e^{z_i}}{\sum_j e^{z_j}}
$$

MSE：

$$
L_{MSE}=\frac{1}{N}\sum_i(\hat y_i-y_i)^2
$$

梯度下降：

$$
\theta_{t+1}=\theta_t-\eta\nabla_\theta L
$$

反向传播中的链式法则：

$$
\frac{\partial L}{\partial x}=\frac{\partial L}{\partial y}\frac{\partial y}{\partial x}
$$

自注意力：

$$
\operatorname{Attention}(Q,K,V)=\operatorname{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V
$$

行为克隆：

$$
L_{BC}=\frac{1}{N}\sum_i\|\pi_\theta(o_i,l_i)-a_i\|_2^2
$$

动作归一化：

$$
a'=\frac{a-\mu_a}{\sigma_a+\epsilon}
$$

动作反归一化：

$$
\hat a=\hat a'(\sigma_a+\epsilon)+\mu_a
$$

LoRA 更新：

$$
W'=W+\frac{\alpha}{r}BA
$$

## C. 推荐教材与在线资料

### 1. 深度学习基础

- Ian Goodfellow、Yoshua Bengio、Aaron Courville，*Deep Learning*。在线版本：[https://www.deeplearningbook.org/](https://www.deeplearningbook.org/)。建议重点学习前馈网络、正则化、优化、卷积网络和序列模型相关章节。
- *Dive into Deep Learning / 动手学深度学习*：[https://zh.d2l.ai/](https://zh.d2l.ai/)。有理论、推导和代码，适合边学边练。
- Stanford CS231n：[https://cs231n.stanford.edu/](https://cs231n.stanford.edu/)。重点参考图像分类、卷积网络、训练技巧和视觉模型。

### 2. PyTorch 官方资料

- [PyTorch Learn the Basics](https://docs.pytorch.org/tutorials/beginner/basics/intro)：Tensor、Dataset、模型、自动微分、优化循环和模型保存。
- [PyTorch Quickstart](https://docs.pytorch.org/tutorials/beginner/basics/quickstart_tutorial.html)：快速看完整训练流程。
- [Autograd mechanics](https://docs.pytorch.org/docs/stable/notes/autograd)：理解自动微分和计算图。
- [Training with PyTorch](https://docs.pytorch.org/tutorials/beginner/introyt/trainingyt)：训练循环、损失函数和优化器。
- [Datasets & DataLoaders](https://docs.pytorch.org/tutorials/beginner/basics/data_tutorial.html)：自定义数据集与批量加载。
- [Transfer Learning for Computer Vision](https://docs.pytorch.org/tutorials/beginner/transfer_learning_tutorial.html)：迁移学习和冻结特征提取器。
- [PyTorch AMP](https://docs.pytorch.org/docs/stable/amp.html)：自动混合精度。

### 3. Transformer 与参数高效微调

- *Attention Is All You Need*：Transformer 原始论文，建议重点理解注意力结构。
- Hugging Face PEFT LoRA 指南：[https://huggingface.co/docs/peft/main/en/conceptual_guides/lora](https://huggingface.co/docs/peft/main/en/conceptual_guides/lora)。
- Hugging Face Transformers 微调指南：[https://huggingface.co/docs/transformers/main/training](https://huggingface.co/docs/transformers/main/training)。

### 4. 与毕业设计衔接的 VLA 资料

- OpenVLA 论文：[https://arxiv.org/abs/2406.09246](https://arxiv.org/abs/2406.09246)。重点关注视觉输入、语言条件、动作表示和微调数据格式。
- OpenVLA 项目：[https://github.com/openvla/openvla](https://github.com/openvla/openvla)。以当前官方仓库说明为准，检查所需依赖、支持的机器人数据格式和推理方式。
- OpenVLA-OFT 项目：[https://openvla-oft.github.io/](https://openvla-oft.github.io/)。重点关注动作分块与训练/推理优化。
- RDT-1B 项目：[https://rdt-robotics.github.io/rdt-robotics/](https://rdt-robotics.github.io/rdt-robotics/)。重点关注双臂动作建模和数据适配。

**版本提醒：** PyTorch、CUDA、TorchVision、Transformers、PEFT 和机器人驱动版本会更新。真正部署时，先查看实验室服务器的 GPU、驱动和 CUDA 环境，再使用 PyTorch 官方安装页面选择匹配版本：[https://pytorch.org/get-started/locally/](https://pytorch.org/get-started/locally/)。不要把网上某条固定的 pip 命令直接复制到实验室机器上。

---

# 最后的学习建议

把这份笔记分成三轮学习：

**第一轮：建立概念。** 重点读第 1—7 章，能用自己的话说明网络、损失、梯度、优化和过拟合。

**第二轮：动手编程。** 重点读第 8—17 章，至少亲手完成 MLP 训练、CNN 图像任务、自定义 Dataset、视觉状态动作回归和 checkpoint 保存加载。

**第三轮：连接毕业设计。** 重点读第 18—20 章，并结合 OpenVLA 或 RDT 的官方仓库，逐项核对输入数据、动作格式、训练脚本和评估方式。

最重要的验收不是“看完了多少页”，而是你能独立完成以下闭环：**读取一批正确对齐的机器人示范数据 → 构建 Dataset/DataLoader → 定义模型 → 计算损失 → 反向传播 → 更新参数 → 验证模型 → 保存权重 → 在离线样本上推理并解释动作输出。**
