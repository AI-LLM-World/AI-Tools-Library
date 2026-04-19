"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var react_2 = require("@testing-library/react");
var Button_1 = require("../Button");
test('renders button with children', function () {
    (0, react_2.render)(<Button_1.default>Click me</Button_1.default>);
    expect(react_2.screen.getByText('Click me')).toBeInTheDocument();
});
