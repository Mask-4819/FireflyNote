## 调度执行(scheduler)
所谓可调度，指的是当**trigger**动作触发副作用函数重新执行时，有能力决定副作用函数执行的时机、次数以及方式

```ts
it('scheduler', () => {
    let dummy;
    let run: any
    const scheduler = vi.fn(() => {
        run = runner
    });
    const runner = effect(
        () => {
            dummy = obj.count
        },
        { scheduler }
    );
    // 初始化不调用
    expect(scheduler).not.toHaveBeenCalled()
    // obj.count的初始值为0
    expect(dummy).toBe(0)
    // should be called on first trigger
    obj.count++;
    // 在对count进行赋值操作之后，会触发scheduler
    expect(scheduler).toHaveBeenCalledTimes(1)
    // should not run yet
    // 触发调度执行之后，不执行 run方法，先执行调度
    expect(dummy).toBe(0)
    // manually run
    // effect返回run，用于手动执行
    run()
    // should have run
    // 手动执行run之后，触发依赖的修改执行
    expect(dummy).toBe(1)
})
```
根据测试案例的业务需求，对代码进行功能的开发。

```ts
// effect副作用函数
export function effect<T = any>(
        fn: () => T, 
        options?: ReactiveEffectOptions // 新增++  options用于接受配置对象中的参数
    ): ReactiveEffectRunner {
    // 实例化类  
    const _effect = new ReactiveEffect(fn);
    // 新增++ 如果存在配置对象，则直接将对象与当前的实例进行合并
    if (options) {
        Object.assign(_effect, options)
    }
    // 执行fn，在此之前可以执行其他的操作
    _effect.run();
    // 新增++ 返回runner，用于后续的执行
    let runner = _effect.run.bind(_effect) as ReactiveEffectRunner;
    return runner;
}

export function triggerEffect(deps: Dep | ReactiveEffect[]) {
    deps?.forEach(effect => {
        // 新增++ 函数调度的方法，如果有函数的调度，直接执行(run不执行)
        if (effect.scheduler) {
            // scheduler 可以让用户自己选择调用的时机
            // 这样就可以灵活的控制调用了
            // 在 runtime-core 中，就是使用了 scheduler 实现了在 next ticker 中调用的逻辑
            effect.scheduler();
        } else {
            effect.run();
        }
    });
}
```

## stop

