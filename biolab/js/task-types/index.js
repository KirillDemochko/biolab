// Реестр типов заданий. Новый тип = новый файл + одна строка здесь.
import * as choice from './choice.js';
import * as match from './match.js';
import * as order from './order.js';
import * as input from './input.js';

export const taskTypes = { choice, multi: choice, match, order, input };
