# type-challenges 类型体操

## 基础类型

ts与js的关系对应关系

```typescript
const name:string = 'lwz';
const age:number = 24;
const male:boolean = true;

const undef: undefined = undefined;
const nul:null = null;

const obj:object = {name: name, age: age};
const bigintVar1: bigint = 9007199254740991n;
const bigintVar2: bigint = BigInt(9007199254740991);
const symbolVar: symbol = Symbol('unique');
```

ts的基础类型大体上跟js没太多的差异性。

## undefined与null的差异 

但是在**undefined** 与 **null**上两者是有差异的。

在JavaScript中  
**undefined**: **未定义**的值，表示**没有**值  
**null**: **有值**，但是是个**空值**

在typescript中:  
如果关闭了**strictNullChecks**, 则undefined与null为**其他子类型**。

## void

void表示函数**没有**返回值，或者返回值为**undefined**，因为undefined表示没有值

```typescript
function fn1():void {}
function fn2():void {
    return;
}
function fn3():void {
    return undefined;
}
```

以上三种类型都可以使用void作为函数的返回类型。

## 数组与元组

在typescript中，常用的数组类型有

```typescript
const arr: string[] = ['l','w','z'];
const arr2: number[] = [1,2,3];
// 元组
const arr3: [string, number,boolean] = ['l',3,true];
```

数组的另一种写法是通过泛型的模式去处理

```typescript
const arr: Array<string> = = ['l','w','z'];
```

数组的类型可以按照内部填充的元素进行处理。也可以写在外部，表示数组内部都是统一的数组。
特殊记忆法：**数字数组**，**字符串数组**，**布尔数组**， 混合数组等。

其中混合数组的模式，其实就是**元组**

| 数组                 | 元组                 |
| :------------------- | :------------------- |
| 每一项都是相同的类型 | 每一项都可以单独定义 |
| 没有长度限制         | 有固定的长度         |
| 用于表示一个列表     | 用于表示一个结果     |

**元组的作用**：避免隐式访问的越界问题

```typescript
const arr: string[] = ['l','w','z'];
console.log(arr[999]);
const [a,b,c,reset] = arr; 
console.log(reset);
```

以上的数组访问直接越界是可以允许存在的。 

如果是元组，则在越界的情况下会弹出警告
```typescript
const arr: [string, string, string] = ['l','w','z'];
console.log(arr[999]); // 警告
const [a,b,c,reset] = arr;// 警告
```

所以元组能提高我们在使用数组时候的严谨性，在**定长的数组**中使用最佳。

## 对象类型

对象类型作为常用的类型，在typescript中主要有两种声明方式:  **interface**、**type**。

```typescript
interface Person1 {
  name: string;
  age: number;
  male: boolean;
}
type Person2 = {
  name: string;
  age: number;
  male: boolean;
}
const obj1: Person1 = {
  name: 'lwz',
  age: 24,
  male: true,
}
const obj2: Person2 = {
  name: 'lwz',
  age: 24,
  male: true,
}
```
以上两种为对象标注类型的方式。  
**interface**：接口，这种方式比较偏向于描述**对象**、**类**的结构  
**type**：类型别名。用于描述**函数签名**、**联合类型**、**工具类型**。  

**对象的只读和可选**:
```typescript
interface Person {
  readonly name: string;
  age: number;
  male?: boolean;
}
const obj:Person = {
  name: 'lwz',
  age: 24,
};

// const obj:Person = {
//   name: 'lwz',
//   age: 24,
//   male:1 // 报错，?设置可选类型之后，male的类型为 boolean | undefined。不填时为undefined。不能赋值这两个属性之外的值
// };

obj.name = 'LWZ'; // 报错，readonly 描述之后不能进行修改
```
## 字面量类型与联合类型
```typescript
interface res {
  text: string, // 原始类型
  message: 'message', // 字面量类型
  code: 200 | 404 | 500 // 联合类型
}
```
原始类型：常用的类型  
字面量类型：精确的类型推论  
联合类型：一组类型的可用集合，包含了原始类型和字面量类型
