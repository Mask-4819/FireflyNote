
## cleanupEffect
接下来查看一个需求
```js
const obj = {status:true, text:"cheanupEffect"}
const data = new Proxy(obj,{....})
effect(() => {
    cosnt text = data.status ? data.text : "text"
});
```
在上面的代码中，  
当**status**为true, 在effect执行run时，**getter**会读取到**status**和**text**， 对这两个依赖都进行收集。
```js
// 依赖如下
depsMap
    --> status
        --> [effect]
    --> text
        --> [effect]
```
如果现在手动的将status设置为false，data.status = false; 
1. 首先会触发**status**的**getter**，然后进行依赖的重新收集
2. 然后进行赋值，触发setter操作，获取**status**收集的依赖，执行依赖
3. 依赖的执行，会重新触发依赖的收集。  

将**status**设置为false的时候，无论怎么修改**text**都不应该触发依赖的执行。但是由于依赖一直都存在已收集的text下，所以修改**text**时一直都会触发**text下的**  [**effect**]依赖执行。  
解决的办法：
再每次执行 **ReactiveEffect** 内的 **run** 执行 **fn()** 之前，把所有的依赖清空，然后再执行 **fn** 对当前正在执行的依赖进行收集
```js
// 依赖如下
depsMap
    --> status
        --> []
    --> text
        --> []
// 先全部清空
// 然后收集当前的this
depsMap
    --> status
        --> [effect]
    --> text
        --> []
```
首先修改**track**, 让**activeEffect**用deps把每一个**dep**都收集起来，主要是引用其地址
```ts
export function track(target: object, key: unknown) {
    ...
    ...
    // 如果deps中不包含当前的依赖，则进行收集
    if (!deps.has(activeEffect!)) {
        // 收集当前的 ReactiveEffect的实例
        deps.add(activeEffect!);
        //新增++ 反向收集，把deps存储到activeEffect中，用于cleanup
        activeEffect?.deps.push(deps);
    }

}
export function trigger(target: object, key: unknown) {
    // 获取依赖
    let depsMap = targetMap.get(target);
    if (!depsMap) return;
    // 获取收集到的 ReactiveEffect
    let deps = depsMap.get(key);
    deps?.forEach(item => item.run())
}
export class ReactiveEffect<T = any> {
    public deps: Dep[] = [];
    constructor(public fn: () => T) {
    }
    run() {
        //新增++ 清除副作用的影响， 把所有收集到的 effecet
        cleanupEffect(this);
        // 全局存储当前的实例
        activeEffect = this;
        // 执行当前正在运行的方法，会去触发getter操作
        const res = this.fn();
        return res;
    }
}
// 新增++ 清空依赖的方法
function cleanupEffect(effect: ReactiveEffect) {
    let { deps } = effect;
    if (deps.length) {
        console.log("cleanupEffect清空依赖");
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect)
        }
        deps.length = 0;
    }
}
```
在进行上述代码的新增之后，当设置**status**为false时：  
1. 触发**status**的setter操作，然后触发**trigger**方法。
2. 获取依赖 **targetMap** -> **depsMap** -> **deps** -> **dep.run()**。
3. **run**方法执行触发**ReactiveEffect**的run。
4. 然后执行**cleanupEffect**,把**deps**中的所有dep清空(这里存在无限递归的问题)。
5. 然后执行fn(),就会直接执行  **cosnt text = data.status ? data.text : "text"**，由于**status**修改为了**false**，所以进行依赖收集的时候，只会收集**status**的依赖
6. 当直接修改**text**的值的时候，会触发**trigger**操作。**targetMap** -> **depsMap** -> **deps**(空Set)，所以**deps**为空的**Set()**,则无法遍历执行**run**。所以不会触发后续的操作。

上面的修改完之后，如果执行代码，会发现有递归的问题。  
主要是因为
```ts
export function trigger(target: object, key: unknown) {
   ...
   ...
    let deps = depsMap.get(key);
    // run -> 调用下面class的run -> cleanup删除 -> thi.fn() -> track又追加deps（死循环）
    deps?.forEach(item => item.run())
}

export class ReactiveEffect<T = any> {
    ...
    run() {
        //
        cleanupEffect(this);
        const res = this.fn();
        ...
    }
}
```
**deps.forEach** -> **item.run** -> 调用下面class的**run** -> cleanupEffect清空**deps** -> this.**fn**() -> 运行收集起来的依赖，触发**getter**->**track**又追加**deps**-> **deps**遍历（死循环）

解决的办法：将**deps**的数据**拷贝**一份新的，用于遍历执行，**cleanupEffect**用于处理**deps**的数据，将遍历的数据与修改的数据隔开。

```js
export function trigger(target: object, key: unknown) {
   ...
   ...
    let deps = depsMap.get(key);
    // run -> 调用下面class的run -> cleanup删除 -> thi.fn() -> track又追加deps（死循环）
    // 去除 --
    //deps?.forEach(item => item.run());
    // 新增++
    const effects: ReactiveEffect[] = [];
    if (key !== void 0) {
        deps?.forEach((effect) => {
            effects.push(effect);
        })
    };
    effects?.forEach(effect => effect.run());
}
```
添加测试代码确保功能正确
```ts

it("cleanupEffect", () => {
    // 使用effect包裹内容
    const fnSpy = vi.fn(() => {
        const test = obj.status ? obj.text : "test";
        console.log(test);
    });
    effect(fnSpy);
    // 进行类型断言
    expect(obj.text).toBe("vue3Effect");
    // 1.上面手动effect(fnSpa)时，fnSpa调用了一次
    expect(fnSpy).toHaveBeenCalledTimes(1);
    // 修改值，继续进行断言
    obj.status = false;
    // 2.status trigger后，run执行，清空依赖，重新收集，调用第二次
    expect(fnSpy).toHaveBeenCalledTimes(2);
    // 修改text的值，并不会触发effect副作用函数的执行，
    obj.text = "text";
    // 在上面 2时，重新收集了依赖，text进行trigger时，找不到text的依赖执行run，所以fnSpy总共调用2次
    expect(fnSpy).toHaveBeenCalledTimes(2);
});
```

## 嵌套effect
先看一下测试案例
```ts
it("嵌套effect", () => {
    const fn = () => {
        effect(() => {
            console.log("内层执行:", obj.status);
        });
        console.log("外层执行:", obj.text);
    }
    effect(fn);
    obj.text = 'wz';
})
```
上面这条测试案例的输出顺序，理论上应该是：
effect -> run -> (执行嵌套 effect -> run -> 内层执行) -> 外层
然后**obj.text**赋值时触发**trigger**， 重新执行上面的流程。
```js
内层执行: true
外层执行: vue3Effect
内层执行: true
外层执行: wz
```
但是最后执行的结果却是
```js
内层执行: true
外层执行: vue3Effect
内层执行: true
```
这是由于**activeEffect**全局变量造成的  
当发生嵌套的时候，**activeEffect**永远指向的是内层**effect**，所以导致后续的执行过程中，不会执行到外层的内容。  

解决方案：通过栈的方式处理  
在全局添加一个**effectStack**，每一次调用的时候，都进行压栈，调用完之后进行弹栈，并将**acticeEffect**指向栈顶。 

首先执行外层**effect**时，把fn压栈，接受到嵌套**effect**时，继续压栈，在当前effect执行完毕之后，进行弹栈，然后把activeEffect指向栈顶(即外层effect)，那么后续就能调用到外层的effect
```ts
export class ReactiveEffect<T = any> {
    public deps: Dep[] = [];
    constructor(public fn: () => T) {
    }
    run() {
        if (!effectStack.includes(this)) {
            // 清除副作用的影响， 把所有收集到的 effecet
            cleanupEffect(this);
            // 全局存储当前的实例
            activeEffect = this;
            // 压栈
            effectStack.push(this);
            // 执行当前正在运行的方法，会去触发getter操作
            const res = this.fn();
            // 执行之后弹栈
            effectStack.pop();
            // 指向栈顶
            activeEffect = effectStack[effectStack.length - 1];
            return res;
        }
    }
}

```

## 避免无限递归问题

看一个测试案例
```ts
it("避免无限递归 ", () => {
    let dummy1;
    effect(() => { dummy1 = obj.count });
    expect(dummy1).toBe(0);
    obj.count++;
    expect(dummy1).toBe(1);
})
```
运行测试案例，按照正常的的逻辑来说，断言应该是正确的，但是却出现了无限递归的问题。  
问题的原因所在： obj.count++
```js
obj.count++ -> obj.count = obj.count + 1;
```
执行该函数时，先读取**obj.count**,触发**track**操作，然后在 + 1赋值给**obj.count**触发**trigger**操作,把依赖拿出来执行，然而依赖还没执行完成，又拿出来执行，导致无限的自己调用自己。  

问题的原因所在就是，**track**和**trigger**在触发同一个函数。
  
那么只要把**track**和**trigger**触发的不是同一个函数即可。
```ts
export function trigger(target: object, key: unknown) {
   ...
   ...
    let deps = depsMap.get(key);
    const effects: ReactiveEffect[] = [];
    if (key !== void 0) {
        deps?.forEach((effect) => {
            // 新增++ 如果与当前的activeEffect不相同时，则用来执行
            if(effect !== activeEffect) {
                effects.push(effect);
            }
        })
    };
    effects?.forEach(effect => effect.run());
}
```