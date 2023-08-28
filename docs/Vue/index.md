## Vue 的认知

> Vue 是一款用于构建用户界面的渐进式 JavaScript 框(当前文章基于 Vue3)
vue 主要实现的功能可以看作是一个函数，**UI = render(state)**。那么就能得出两个点：
- **render**：渲染函数。基于 Vnode 进行渲染，生成所需的页面
- **state**：状态(响应式数据),根据当前数据的状态的去触发 render 函数的进行 DOM 的更新。

## 响应式的基本认知

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

从上面的结果可以看出, 在对 **data.text** 进行赋值后, **obj.text** 的内容也发生了变化。


## 响应式数据与HTML渲染关联
1. 需要对数据进行响应式拦截。
2. 需要一个渲染函数。
3. 将 1 和 2 进行融合处理。

```js
// 1、首先需要一个源数据。
const data = { text: "hello world" };

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
    // 
    effect();
    return res;
  },
});
effect(); // 页面输出结果： hello world
setTimeout(() => {
  obj.text = "hello Vue3";
}, 2000); // 两秒后结果变成 hello Vue3
```

接下来再使用一个容器，把effect函数收集起来，然后再set修改的时候去遍历容器，然后执行收集起来的effect
```js
// 新增++  定义一个用于存储的容器
const bucket = new Set();
const obj = new Proxy(data, {
  get(target, key) {
    // 新增++   在get的时候用容器将effcet存储起来
    bucket.add(effect);
    return target[key];
  },
  set(target, key, newVal) {
    /**
     * ！注意
     *    此处要先对target[key]先进行赋值，再去触发effect函数。
     *    否则会因为渲染先于变量的修改，导致DOM渲染内容不变。
     */
    let res = (target[key] = newVal);
    // 新增++ 在set的时候从容器中获取收集起来的函数执行
    bucket.forEach(item => item())
    return res;
  },
});

```


一个最简陋版本的的响应式渲染就完成了。然而真正的响应式又会复杂那么一丢丢。

## Vue中的响应式实现
在Vue中，核心的api是effect(副作用函数)，主要就是对于响应式数据的使用到的代码片段进行收集，在数据发生修改的时候执行该代码片段，从而进行响应式数据更新。

在上面的实现过程中，当对响应式数据进行set时，需要手动的去执行effect。  
将effect稍微改进一下，effect接受一个方法fn作为参数。 
```ts
// 全局变量，用于保存当前的 reactiveEffect，用于收集
export let activeEffect: ReactiveEffect | undefined
// 依赖收集
class ReactiveEffect<T = any> {
    constructor(public fn: () => T) {}
    run() {
        // 全局存储当前的实例
        activeEffect = this;
        return this.fn();
    }
}
// effect副作用函数
export function effect<T = any>(fn: () => T) {
    // 实例化类
    let _effect = new ReactiveEffect(fn);
    // 执行fn，在此之前可以执行其他的操作
    _effect.run();
}
```
当使用effect进行包裹一个函数之后，effect会执行，并且实例化一个ReactiveEffect，执行run时触发get，在此时进行track收集。  
当代理的数据被修改之后，触发set，然后进行trigger更新。 

在proxy中添加依赖收集(track)和依赖触发(trigger);
```ts
const obj = new Proxy(data, {
  get(target, key) {
    // 在读取的时候，进行收集
    track(target, key);
    return target[key];
  },
  set(target, key, newVal) {
    let res = (target[key] = newVal);
    // 在修改的时候，进行触发
    trigger(target, key);
    return res;
  },
});
```
实现track 和trigger功能
```ts
// dep的类型为Set，里面保存的是 ReactiveEffect
type Dep = Set<ReactiveEffect>
// depsMap的类型为Set，里面保存的是 Dep
type KeyToDepMap = Map<any, Dep>;
// 全局依赖的存储容器
const targetMap = new WeakMap<any, KeyToDepMap>();
// 全局变量，用于保存当前的 reactiveEffect，用于收集
export let activeEffect: ReactiveEffect | undefined
// 依赖收集
class ReactiveEffect<T = any> {
    constructor(public fn: () => T) {
    }
    run() {
        // 全局存储当前的实例
        activeEffect = this;
        return this.fn();
    }
}
// effect副作用函数
export function effect<T = any>(fn: () => T) {
    // 实例化类
    let _effect = new ReactiveEffect(fn);
    // 执行fn，在此之前可以执行其他的操作
    _effect.run();
}

export function track(target: object, key: unknown) {
    // 获取depsMap: Map
    let depsMap = targetMap.get(target);
    if (!depsMap) {
        depsMap = new Map();
        targetMap.set(target, depsMap);
    };
    // 获取deps:Set
    let deps = depsMap.get(key);
    if (!deps) {
        deps = new Set();
        depsMap.set(key, deps)
    }
    // 如果deps中不包含当前的依赖，则进行收集
    if (!deps.has(activeEffect!)) {
        // 收集当前的 ReactiveEffect的实例
        deps.add(activeEffect!);
    }
}

export function trigger(target: object, key: unknown) {
    // 获取依赖
    let depsMap = targetMap.get(target);
    if (!depsMap) return;
    // 获取收集到的 ReactiveEffect
    let dep = depsMap.get(key);
    // 遍历执行收集起来的 activeEffect
    for (const effect of dep!) {
        effect.run();
    }
}
```


完成功能之后引入测试，确保功能的正确性
```ts 
import { it, expect, describe, vi } from 'vitest'
import { effect, track, trigger } from "../src/effect";

describe('reactivity/effect', () => {
    const data = { text: "vue3Effect", status: true };
    // 创建代理数据
    const obj = new Proxy(data, {
        get(target, key) {
            // 在读取的时候，进行收集
            track(target, key);
            return Reflect.get(target, key);
        },
        set(target, key, newVal) {
            let res = Reflect.set(target, key, newVal);
            // 在修改的时候，进行触发
            trigger(target, key);
            return res;
        },
    });
    it('should run the passed function once (wrapped by a effect)', () => {
        // 模拟函数
        const fnSpy = vi.fn(() => { })
        // effect副作用函数
        effect(fnSpy)
        // 副作用函数会被调用一次
        expect(fnSpy).toHaveBeenCalledTimes(1);
    });
    it("test proxy", () => {
        // 使用effect包裹内容
        effect(() => {
            console.log(obj.text);
        });
        // 进行类型断言
        expect(obj.text).toBe("vue3Effect");
        // 修改值，继续进行断言
        obj.text = "hello wz";
        expect(obj.text).toBe("hello wz");
    });
})
```
进行修改之后，就不需要在数据进行set的时候手动的去调用effect了，  
在track的时候把依赖到的数据存储到容器中。  
然后在trigger中找到对存储在容器中的依赖，直接根据已经修改之后的值去执行依赖，从而实现响应式更新。

## 总结
1. 了解vue主要实现的功能是 UI = render(state)。
2. 使用proxy和effect实现了一个简陋版的响应式。
3. 基于简陋的数据响应式，完善effect函数、track函数、trigger函数。
4. 引入测试，确保功能的正确性。