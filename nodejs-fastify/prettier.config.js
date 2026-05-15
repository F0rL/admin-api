/** @type {import('prettier').Config} */
export default {
  semi: false, // 不加分号
  singleQuote: true, // 使用单引号
  trailingComma: "es5", // 对象/数组尾随逗号（兼容旧浏览器）
  tabWidth: 2, // 缩进宽度
  useTabs: false, // 使用空格而非 Tab
  printWidth: 80, // 单行最大宽度（超长自动换行）
  bracketSpacing: true, // 对象字面量括号内加空格：{ foo: bar }
  arrowParens: "avoid", // 箭头函数单参数省略括号：x => x
  endOfLine: "lf", // 统一换行符为 \n（Linux/macOS 风格）
  vueIndentScriptAndStyle: false, // Vue 的 <script> 和 <style> 不额外缩进
};
