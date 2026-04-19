import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
const Button = React.forwardRef(function Button({ children, variant = 'primary', className = '', ...rest }, ref) {
    const cls = `gstack-btn gstack-btn--${variant} ${className}`.trim();
    return (_jsx("button", { ...rest, ref: ref, className: cls, children: children }));
});
export default Button;
//# sourceMappingURL=Button.js.map