"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Secondary = exports.Primary = void 0;
var Button_1 = require("./Button");
var meta = {
    title: 'Components/Button',
    component: Button_1.default,
};
exports.default = meta;
exports.Primary = {
    args: { children: 'Primary Button', variant: 'primary' }
};
exports.Secondary = {
    args: { children: 'Secondary', variant: 'secondary' }
};
