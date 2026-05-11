import prettier from 'eslint-config-prettier'
import svelte from 'eslint-plugin-svelte'
import ts from 'typescript-eslint'

const functionalRules = [
  {
    selector: 'ClassDeclaration, ClassExpression',
    message: 'Classes are not allowed. Use functions and plain objects instead.'
  },
  {
    selector: 'ForStatement',
    message: 'for loops are not allowed. Use array methods like .forEach(), .map(), etc.'
  },
  {
    selector: 'ForOfStatement',
    message: 'for...of loops are not allowed. Use array methods like .forEach(), .map(), etc.'
  },
  {
    selector: 'CallExpression[callee.property.name="push"]',
    message: 'Array.push() mutates the array. Use immutable methods like [...array, item] instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="pop"]',
    message: 'Array.pop() mutates the array. Use immutable methods like array.slice(0, -1) instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="shift"]',
    message: 'Array.shift() mutates the array. Use immutable methods like array.slice(1) instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="unshift"]',
    message:
      'Array.unshift() mutates the array. Use immutable methods like [item, ...array] instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="splice"]',
    message:
      'Array.splice() mutates the array. Use immutable methods like array.slice() and spread operator instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="reverse"]',
    message:
      'Array.reverse() mutates the array. Use immutable methods like [...array].reverse() or array.toReversed() instead.'
  },
  {
    selector: 'CallExpression[callee.property.name="sort"]',
    message:
      'Array.sort() mutates the array. Use immutable methods like [...array].sort() or array.toSorted() instead.'
  }
]

const letRule = {
  selector: 'VariableDeclaration[kind="let"]',
  message: 'let is not allowed. Use const instead.'
}

export default [
  {
    ignores: ['coverage/**', 'build/**', 'data.json']
  },
  ...ts.configs.recommended,
  ...svelte.configs['flat/recommended'],
  prettier,
  ...svelte.configs['flat/prettier'],
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true // Allow inference in arrow functions
        }
      ],
      'no-restricted-syntax': ['error', ...functionalRules, letRule]
    }
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser
      }
    },
    rules: {
      'no-restricted-syntax': ['error', ...functionalRules]
    }
  }
]
