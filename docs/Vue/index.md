## Vue 的认知

> Vue 是一款用于构建用户界面的渐进式 JavaScript 框(当前文章基于 Vue3)

vue 主要实现的功能可以看作是一个函数， UI = render(state)。那么就能得出两个点：

- **render**：渲染函数。基于 Vnode 进行渲染，生成所需的页面
- **state**：状态(响应式数据),根据当前数据的状态的去触发 render 函数的进行 DOM 的更新。

## 最简陋的响应式实现

在 Vue3 中响应式机制是基于**Proxy**。

```js
// 被代理的源对象
const data = { text: "hello world" };
// 经过proxy代理后的对象
const obj = new Proxy(data, {
  get(target, key) {
    // 当读取被代理的data属性时触发
    return target[key];
  },
  set(target, key, newVal) {
    // 当设置 data的属性时触发
    return (target[key] = newVal);
  },
});
console.log(obj.text); // 结果：hello world
data.text = "hello Vue3";
console.log(obj.text); // 结果：hello Vue3

obj.text = "hello Vue";
console.log(data.text); // 结果：hello Vue
```

从上面的结果可以看出, 在对 data.text 进行赋值后, obj.text 的内容也发生了变化。
<a href="#Proxy" style=cursor:pointer>Proxy 详情</a> 在下面的内容中再描述。

那么将响应式数据与 HTML 渲染关联起来，实际情况要复杂那么一丢丢。

1. 需要对数据进行响应式拦截。
2. 需要一个渲染函数。
3. 将 1 和 2 进行融合处理。

```js
// 1、首先需要一个响应式拦截的数据, 先把上面的代码拉过来。稍后对代码进行一点点的改造。
const data = { text: "hello world" };
// const obj = new Proxy(data, {
//   get(target, key) { return target[key] },
//   set(target, key, newVal) { return (target[key] = newVal) },
// });
// 2、需要一个渲染函数
function effect() {
  document.body.innerText = obj.text;
}
// 3、简单的将 1 和 2 进行融合
const obj = new Proxy(data, {
  get(target, key) {
    return target[key];
  },
  set(target, key, newVal) {
    /**
     * ！注意
     *    此处要先对target[key]先进行赋值，再去触发effect函数。
     *    否则会因为渲染先于变量的修改，导致DOM渲染内容不变。
     */
    let res = (target[key] = newVal);
    effect();
    return res;
  },
});
effect(); // 页面输出结果： hello world
setTimeout(() => {
  obj.text = "hello Vue3";
}, 2000); // 两秒后结果变成 hello Vue3
```

一个最简陋版本的的响应式渲染就完成了。然而真正的响应式又会复杂那么一丢丢。 先理解 Proxy。

<h2 id="Proxy" style="color:#213547;">理解 Proxy</h2>

> Proxy 对象用于创建一个对象的代理，从而实现基本操作的拦截和自定义（如属性查找、赋值、枚举、函数调用等）

Proxy 的基本用法如下： const p = new Proxy(target, handler)

- **target**: 被代理的对象，在 JavaScript 中，万物皆对象。所以 target 可以是一个普通的对象，也可以是一个函数、数组，甚至可以是另一个 Proxy。
- **handler**: 代理捕获器，它是一个处理函数，当被代理对象进行语义的基本操作时(如：属性查找、赋值、枚举、函数调用等)，就可以在捕获器内部进行拦截，拦截后可以按照需求，对当前操作进行自己想要的操作处理。

```js
const people = {
  name: "lwz",
  age: 18,
  say() {
    console.log(`my name is ${this.name}`);
  },
};
const p = new Proxy(people, {
  get() {},
  set() {},
  has() {},
});
```

## 实现一个完整的响应式
