/* @ds-bundle: {"format":3,"namespace":"SOAPAPDesignSystem_cd0592","components":[{"name":"Avatar","sourcePath":"components/core/Avatar.jsx"},{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"Chip","sourcePath":"components/core/Chip.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Table","sourcePath":"components/data/Table.jsx"},{"name":"Alert","sourcePath":"components/feedback/Alert.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"NavItem","sourcePath":"components/navigation/NavItem.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/core/Avatar.jsx":"4bc47d189a0f","components/core/Badge.jsx":"7dbb482003c0","components/core/Button.jsx":"283613bbdbda","components/core/Card.jsx":"038a3bd22d85","components/core/Chip.jsx":"39eb13c8e403","components/core/IconButton.jsx":"552d46413cb4","components/data/Table.jsx":"7f9788ca532a","components/feedback/Alert.jsx":"bfc7df41ed9e","components/feedback/Dialog.jsx":"7bf7ef1e69da","components/feedback/Spinner.jsx":"b1c64d0555d6","components/forms/Checkbox.jsx":"ff1fd9475373","components/forms/Input.jsx":"1f76528016ee","components/forms/Radio.jsx":"78081778e3a9","components/forms/Select.jsx":"e5f54774e6ec","components/forms/Switch.jsx":"14d23eea0cf3","components/forms/Textarea.jsx":"93d3a070816a","components/navigation/Breadcrumb.jsx":"bd9de4ffecb9","components/navigation/NavItem.jsx":"6b3d18cd7e7f","components/navigation/Pagination.jsx":"ad84bcf4163b","components/navigation/Tabs.jsx":"1d4f224304d2"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SOAPAPDesignSystem_cd0592 = window.SOAPAPDesignSystem_cd0592 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Avatar — initials or image, circle by default.
 */
function Avatar({
  src,
  alt = "",
  name = "",
  size = 40,
  square = false,
  color = "primary",
  style = {},
  ...rest
}) {
  const initials = name ? name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() : "";
  const bg = {
    primary: "var(--vino-700)",
    secondary: "var(--oro-500)",
    neutral: "var(--grey-700)"
  }[color];
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: size,
    height: size,
    borderRadius: square ? "var(--radius-sm)" : "var(--radius-pill)",
    background: bg,
    color: "var(--white)",
    font: `var(--fw-bold) ${Math.round(size * 0.4)}px/1 var(--font-sans)`,
    overflow: "hidden",
    flexShrink: 0,
    ...style
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: base
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: alt,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Badge — pill status label. Maps to semantic status colors.
 */
function Badge({
  children,
  color = "neutral",
  variant = "soft",
  style = {},
  ...rest
}) {
  const map = {
    neutral: {
      bg: "var(--grey-100)",
      fg: "var(--text-secondary)",
      bd: "var(--grey-200)"
    },
    primary: {
      bg: "var(--vino-050)",
      fg: "var(--vino-700)",
      bd: "#EBD9DF"
    },
    secondary: {
      bg: "#FBF4E6",
      fg: "var(--oro-700)",
      bd: "#F0E2C4"
    },
    success: {
      bg: "var(--success-bg)",
      fg: "var(--success)",
      bd: "var(--success-border)"
    },
    warning: {
      bg: "var(--warning-bg)",
      fg: "var(--warning)",
      bd: "var(--warning-border)"
    },
    error: {
      bg: "var(--error-bg)",
      fg: "var(--error)",
      bd: "var(--error-border)"
    },
    info: {
      bg: "var(--info-bg)",
      fg: "var(--info)",
      bd: "var(--info-border)"
    }
  };
  const c = map[color] || map.neutral;
  const solid = variant === "solid";
  const solidBg = {
    neutral: "var(--grey-700)",
    primary: "var(--vino-800)",
    secondary: "var(--oro-500)",
    success: "var(--success)",
    warning: "var(--warning)",
    error: "var(--error)",
    info: "var(--info)"
  }[color];
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--fw-semibold) 12px/1.2 var(--font-sans)",
      padding: "4px 10px",
      borderRadius: "var(--radius-pill)",
      background: solid ? solidBg : c.bg,
      color: solid ? "var(--white)" : c.fg,
      border: solid ? "1px solid transparent" : `1px solid ${c.bd}`,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Button — institutional flat button.
 * Variants: contained (primary/secondary), outlined, text.
 * Flat: no shadows. 4px radius, bold label, 180ms ease-out.
 */
function Button({
  children,
  variant = "contained",
  color = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  startIcon = null,
  endIcon = null,
  type = "button",
  onClick,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "6px 14px",
      fontSize: 13
    },
    md: {
      padding: "10px 18px",
      fontSize: 14
    },
    lg: {
      padding: "13px 24px",
      fontSize: 15
    }
  };
  const palettes = {
    "contained-primary": {
      background: "var(--vino-800)",
      color: "var(--white)",
      border: "1px solid var(--vino-800)",
      "--h": "var(--vino-700)",
      "--a": "var(--vino-900)"
    },
    "contained-secondary": {
      background: "var(--oro-500)",
      color: "var(--white)",
      border: "1px solid var(--oro-500)",
      "--h": "var(--oro-400)",
      "--a": "var(--oro-700)"
    }
  };
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontFamily: "var(--font-sans)",
    fontWeight: 700,
    letterSpacing: "0.02em",
    lineHeight: 1.2,
    borderRadius: "var(--radius-xs)",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "none",
    transition: "background-color 180ms ease-out, color 180ms ease-out, border-color 180ms ease-out",
    width: fullWidth ? "100%" : "auto",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.5 : 1,
    ...sizes[size]
  };
  let variantStyle = {};
  if (variant === "contained") {
    variantStyle = palettes[`contained-${color}`] || palettes["contained-primary"];
  } else if (variant === "outlined") {
    variantStyle = {
      background: "transparent",
      color: "var(--vino-700)",
      border: "1px solid var(--vino-700)",
      "--h": "var(--vino-050)",
      "--a": "var(--vino-050)"
    };
  } else {
    variantStyle = {
      background: "transparent",
      color: "var(--vino-700)",
      border: "1px solid transparent",
      "--h": "transparent",
      "--a": "transparent"
    };
  }
  const onEnter = e => {
    if (disabled) return;
    if (variant === "contained") e.currentTarget.style.backgroundColor = variantStyle["--h"];else if (variant === "outlined") e.currentTarget.style.backgroundColor = "var(--vino-050)";else e.currentTarget.style.color = "var(--vino-600)";
  };
  const onLeave = e => {
    if (disabled) return;
    e.currentTarget.style.backgroundColor = variant === "contained" ? variantStyle.background : "transparent";
    if (variant === "text") e.currentTarget.style.color = "var(--vino-700)";
  };
  const {
    "--h": _h,
    "--a": _a,
    ...cleanVariant
  } = variantStyle;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    style: {
      ...base,
      ...cleanVariant,
      ...style
    }
  }, rest), startIcon, children, endIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Card — flat surface, 1px hairline border, 8px radius, no shadow.
 * variant "standard"   → 10px vino left-accent bar
 * variant "outstanding" → 10px oro left-accent bar
 * Both shift the accent to oro-dark and wash the surface on hover.
 */
function Card({
  children,
  variant = "plain",
  interactive = false,
  padding = 16,
  style = {},
  ...rest
}) {
  const accent = {
    plain: null,
    standard: "var(--vino-700)",
    outstanding: "var(--oro-500)"
  }[variant];
  const wash = variant === "outstanding" ? "var(--grey-100)" : "var(--grey-050)";
  const base = {
    background: "var(--surface-card)",
    border: "1px solid var(--border-hairline)",
    borderLeft: accent ? `10px solid ${accent}` : "1px solid var(--border-hairline)",
    borderRadius: "var(--radius-sm)",
    boxShadow: "none",
    padding,
    transition: "border-color 180ms ease-out, background-color 180ms ease-out",
    cursor: interactive ? "pointer" : "default",
    ...style
  };
  const hoverable = interactive || accent;
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: e => {
      if (!hoverable) return;
      if (accent) e.currentTarget.style.borderLeftColor = "var(--oro-700)";
      if (accent) e.currentTarget.style.backgroundColor = wash;else e.currentTarget.style.borderColor = "var(--border-strong)";
    },
    onMouseLeave: e => {
      if (!hoverable) return;
      if (accent) e.currentTarget.style.borderLeftColor = accent;
      e.currentTarget.style.backgroundColor = "var(--surface-card)";
      if (!accent) e.currentTarget.style.borderColor = "var(--border-hairline)";
    },
    style: base
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/Chip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Chip — rounded interactive tag/filter. Optional delete & icon.
 */
function Chip({
  label,
  children,
  selected = false,
  onDelete,
  icon = null,
  onClick,
  style = {},
  ...rest
}) {
  const clickable = !!onClick;
  return /*#__PURE__*/React.createElement("span", _extends({
    onClick: onClick,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      font: "var(--fw-semibold) 13px/1 var(--font-sans)",
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)",
      background: selected ? "var(--vino-800)" : "var(--grey-100)",
      color: selected ? "var(--white)" : "var(--text-secondary)",
      border: `1px solid ${selected ? "var(--vino-800)" : "var(--grey-200)"}`,
      cursor: clickable ? "pointer" : "default",
      transition: "background-color 150ms ease-out",
      ...style
    }
  }, rest), icon, label || children, onDelete && /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": "Quitar",
    onClick: e => {
      e.stopPropagation();
      onDelete(e);
    },
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 16,
      height: 16,
      borderRadius: "var(--radius-pill)",
      background: selected ? "rgba(255,255,255,0.25)" : "var(--grey-300)",
      color: selected ? "var(--white)" : "var(--text-secondary)",
      fontSize: 12,
      lineHeight: 1,
      cursor: "pointer",
      marginRight: -4
    }
  }, "\xD7"));
}
Object.assign(__ds_scope, { Chip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Chip.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP IconButton — square/round flat button for a single icon.
 */
function IconButton({
  children,
  size = "md",
  variant = "ghost",
  color = "default",
  disabled = false,
  round = true,
  "aria-label": ariaLabel,
  onClick,
  style = {},
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 40,
    lg: 48
  }[size];
  const palettes = {
    default: {
      color: "var(--text-secondary)",
      hover: "var(--grey-100)"
    },
    primary: {
      color: "var(--vino-700)",
      hover: "var(--vino-050)"
    },
    secondary: {
      color: "var(--oro-700)",
      hover: "#FBF4E6"
    }
  };
  const p = palettes[color] || palettes.default;
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: dims,
    height: dims,
    padding: 0,
    color: p.color,
    background: variant === "contained" ? "var(--grey-100)" : "transparent",
    border: variant === "outlined" ? "1px solid var(--border-strong)" : "1px solid transparent",
    borderRadius: round ? "var(--radius-pill)" : "var(--radius-xs)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "background-color 150ms ease-out, color 150ms ease-out",
    boxShadow: "none",
    ...style
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    "aria-label": ariaLabel,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: e => !disabled && (e.currentTarget.style.backgroundColor = p.hover),
    onMouseLeave: e => !disabled && (e.currentTarget.style.backgroundColor = variant === "contained" ? "var(--grey-100)" : "transparent"),
    style: base
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/data/Table.jsx
try { (() => {
/**
 * SOAPAP Table — striped, flat, 1px border system. Matches MUI table overrides.
 */
function Table({
  columns = [],
  rows = [],
  onRowClick,
  emptyText = "Sin resultados",
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-sm)",
      overflow: "hidden",
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: "var(--font-sans)"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--white)"
    }
  }, columns.map(col => /*#__PURE__*/React.createElement("th", {
    key: col.key || col.label,
    style: {
      textAlign: col.align || "left",
      padding: "12px 14px",
      font: "var(--fw-bold) 13px/1.2 var(--font-sans)",
      color: "var(--text-primary)",
      borderBottom: "1px solid var(--border-hairline)",
      whiteSpace: "nowrap",
      width: col.width
    }
  }, col.label)))), /*#__PURE__*/React.createElement("tbody", null, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length,
    style: {
      padding: "32px 14px",
      textAlign: "center",
      color: "var(--text-disabled)",
      font: "14px var(--font-sans)"
    }
  }, emptyText)) : rows.map((row, i) => /*#__PURE__*/React.createElement("tr", {
    key: row.id ?? i,
    onClick: () => onRowClick && onRowClick(row),
    style: {
      background: i % 2 === 1 ? "var(--surface-zebra)" : "var(--white)",
      cursor: onRowClick ? "pointer" : "default",
      transition: "background-color 100ms"
    },
    onMouseEnter: e => {
      e.currentTarget.style.backgroundColor = "var(--surface-subtle)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.backgroundColor = i % 2 === 1 ? "var(--surface-zebra)" : "var(--white)";
    }
  }, columns.map(col => /*#__PURE__*/React.createElement("td", {
    key: col.key || col.label,
    style: {
      padding: "11px 14px",
      font: "14px/1.5 var(--font-sans)",
      color: "var(--text-primary)",
      borderBottom: "1px solid var(--grey-100)",
      textAlign: col.align || "left"
    }
  }, col.render ? col.render(row[col.key], row) : row[col.key])))))));
}
Object.assign(__ds_scope, { Table });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Table.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Alert.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Alert — institutional severity banner. 8px radius, tinted, bordered, flat.
 */
function Alert({
  severity = "info",
  title,
  children,
  onClose,
  action,
  icon,
  style = {},
  ...rest
}) {
  const map = {
    success: {
      bg: "var(--success-bg)",
      bd: "var(--success-border)",
      fg: "var(--success)",
      ic: "check_circle"
    },
    warning: {
      bg: "var(--warning-bg)",
      bd: "var(--warning-border)",
      fg: "var(--warning)",
      ic: "warning"
    },
    error: {
      bg: "var(--error-bg)",
      bd: "var(--error-border)",
      fg: "var(--error)",
      ic: "error"
    },
    info: {
      bg: "var(--info-bg)",
      bd: "var(--info-border)",
      fg: "var(--info)",
      ic: "info"
    }
  };
  const c = map[severity] || map.info;
  return /*#__PURE__*/React.createElement("div", _extends({
    role: "alert",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      background: c.bg,
      border: `1px solid ${c.bd}`,
      borderRadius: "var(--radius-sm)",
      padding: "12px 14px",
      color: c.fg,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "Material Symbols Rounded",
      fontSize: 20,
      lineHeight: "22px",
      flexShrink: 0
    }
  }, icon || c.ic), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-bold) 14px/1.4 var(--font-sans)",
      marginBottom: children ? 2 : 0
    }
  }, title), children && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) 13px/1.5 var(--font-sans)",
      color: "var(--text-secondary)"
    }
  }, children), action && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8
    }
  }, action)), onClose && /*#__PURE__*/React.createElement("span", {
    role: "button",
    "aria-label": "Cerrar",
    onClick: onClose,
    style: {
      fontFamily: "Material Symbols Rounded",
      fontSize: 18,
      cursor: "pointer",
      color: c.fg,
      opacity: 0.7,
      flexShrink: 0
    }
  }, "close"));
}
Object.assign(__ds_scope, { Alert });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Alert.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/**
 * SOAPAP Dialog — modal overlay. Flat, 8px radius, no shadow on panel.
 */
function Dialog({
  open = false,
  onClose,
  title,
  children,
  actions,
  maxWidth = 480,
  style = {}
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === "string" ? title : undefined,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1300,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "absolute",
      inset: 0,
      background: "rgba(25,28,30,0.5)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      background: "var(--white)",
      border: "1px solid var(--border-hairline)",
      borderRadius: "var(--radius-sm)",
      boxShadow: "none",
      width: "100%",
      maxWidth,
      display: "flex",
      flexDirection: "column",
      ...style
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "18px 20px 16px",
      borderBottom: "1px solid var(--border-hairline)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-bold) 18px/1.3 var(--font-sans)",
      color: "var(--text-primary)"
    }
  }, title), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Cerrar",
    style: {
      background: "none",
      border: "none",
      cursor: "pointer",
      padding: 4,
      display: "flex",
      alignItems: "center",
      color: "var(--text-disabled)",
      fontFamily: "Material Symbols Rounded",
      fontSize: 22
    }
  }, "close")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px",
      flex: 1,
      minHeight: 0,
      overflowY: "auto"
    }
  }, children), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      padding: "14px 20px",
      borderTop: "1px solid var(--border-hairline)"
    }
  }, actions)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
/** SOAPAP Spinner — flat circular loading indicator. */
function Spinner({
  size = 24,
  color = "primary",
  style = {}
}) {
  const c = color === "primary" ? "var(--vino-800)" : color === "secondary" ? "var(--oro-500)" : "var(--text-disabled)";
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      ...style
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    style: {
      animation: "ds-spin 700ms linear infinite"
    },
    "aria-label": "Cargando\u2026",
    role: "img"
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes ds-spin { to { transform: rotate(360deg); } }`), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    stroke: c,
    strokeWidth: "2.5",
    strokeOpacity: "0.2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 3a9 9 0 0 1 9 9",
    stroke: c,
    strokeWidth: "2.5",
    strokeLinecap: "round"
  })));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Checkbox — square check styled to brand. Controlled or uncontrolled.
 */
function Checkbox({
  label,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  id,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const cbId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: cbId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: cbId,
    type: "checkbox",
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 20,
      height: 20,
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "ds-checkbox-box",
    style: {
      width: 20,
      height: 20,
      borderRadius: 4,
      border: "2px solid var(--border-strong)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 120ms, border-color 120ms",
      fontFamily: "Material Symbols Rounded",
      fontSize: 16,
      color: "var(--white)"
    }
  }, "check")), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 14px/1.4 var(--font-sans)",
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("style", null, `
        .ds-checkbox-box { color: transparent; }
        input:checked + .ds-checkbox-box { background: var(--vino-800); border-color: var(--vino-800); color: var(--white); }
        input:focus-visible + .ds-checkbox-box { box-shadow: var(--focus-ring); }
      `));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Input — outlined text field. Optional label, helper, error, icons.
 */
function Input({
  label,
  helperText,
  error = false,
  disabled = false,
  startIcon = null,
  endIcon = null,
  fullWidth = true,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  const borderColor = error ? "var(--error)" : focused ? "var(--vino-700)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: fullWidth ? "100%" : "auto",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "block",
      font: "var(--fw-semibold) 13px/1.2 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-secondary)",
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: disabled ? "#F1F3F5" : "var(--white)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-xs)",
      padding: "0 12px",
      transition: "border-color 150ms ease-out"
    }
  }, startIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-disabled)",
      display: "inline-flex"
    }
  }, startIcon), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      font: "var(--fw-regular) 14px/1.6 var(--font-sans)",
      color: "var(--text-primary)",
      padding: "11px 0",
      ...style
    }
  }, rest)), endIcon && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-disabled)",
      display: "inline-flex"
    }
  }, endIcon)), helperText && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) 12px/1.3 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-disabled)",
      marginTop: 5
    }
  }, helperText));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Radio — single radio control. Use within a group sharing `name`.
 */
function Radio({
  label,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  name,
  value,
  id,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const rId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: rId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: 20,
      height: 20
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: rId,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 20,
      height: 20,
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    className: "ds-radio-ring",
    style: {
      width: 20,
      height: 20,
      borderRadius: "50%",
      border: "2px solid var(--border-strong)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color 120ms"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "ds-radio-dot",
    style: {
      width: 10,
      height: 10,
      borderRadius: "50%",
      background: "var(--vino-800)",
      transform: "scale(0)",
      transition: "transform 120ms ease-out"
    }
  }))), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 14px/1.4 var(--font-sans)",
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("style", null, `
        input:checked + .ds-radio-ring { border-color: var(--vino-800); }
        input:checked + .ds-radio-ring .ds-radio-dot { transform: scale(1); }
        input:focus-visible + .ds-radio-ring { box-shadow: var(--focus-ring); }
      `));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Select — outlined native select styled to match Input.
 */
function Select({
  label,
  helperText,
  error = false,
  disabled = false,
  fullWidth = true,
  options = [],
  placeholder,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const selId = id || reactId;
  const borderColor = error ? "var(--error)" : focused ? "var(--vino-700)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: fullWidth ? "100%" : "auto",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: selId,
    style: {
      display: "block",
      font: "var(--fw-semibold) 13px/1.2 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-secondary)",
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      background: disabled ? "#F1F3F5" : "var(--white)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-xs)",
      transition: "border-color 150ms ease-out"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: selId,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      appearance: "none",
      border: "none",
      outline: "none",
      background: "transparent",
      font: "var(--fw-medium) 14px/1.6 var(--font-sans)",
      color: "var(--text-primary)",
      padding: "11px 36px 11px 12px",
      cursor: disabled ? "not-allowed" : "pointer",
      ...style
    }
  }, rest), placeholder && /*#__PURE__*/React.createElement("option", {
    value: "",
    disabled: true
  }, placeholder), options.map(o => {
    const val = typeof o === "object" ? o.value : o;
    const lab = typeof o === "object" ? o.label : o;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lab);
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: 12,
      pointerEvents: "none",
      color: "var(--text-secondary)",
      fontFamily: "Material Symbols Rounded",
      fontSize: 20
    }
  }, "expand_more")), helperText && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) 12px/1.3 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-disabled)",
      marginTop: 5
    }
  }, helperText));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Switch — toggle. On = vino track.
 */
function Switch({
  label,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  id,
  style = {},
  ...rest
}) {
  const reactId = React.useId();
  const sId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: sId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.55 : 1,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: 40,
      height: 22
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: sId,
    type: "checkbox",
    role: "switch",
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: 40,
      height: 22,
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "ds-switch-track",
    style: {
      width: 40,
      height: 22,
      borderRadius: 999,
      background: "var(--grey-400)",
      transition: "background-color 150ms ease-out"
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "ds-switch-thumb",
    style: {
      position: "absolute",
      top: 3,
      left: 3,
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "var(--white)",
      transition: "transform 150ms ease-out"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      font: "var(--fw-medium) 14px/1.4 var(--font-sans)",
      color: "var(--text-primary)"
    }
  }, label), /*#__PURE__*/React.createElement("style", null, `
        input:checked ~ .ds-switch-track { background: var(--vino-800); }
        input:checked ~ .ds-switch-thumb { transform: translateX(18px); }
        input:focus-visible ~ .ds-switch-track { box-shadow: var(--focus-ring); }
      `));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SOAPAP Textarea — multiline outlined field matching Input.
 */
function Textarea({
  label,
  helperText,
  error = false,
  disabled = false,
  fullWidth = true,
  rows = 4,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const taId = id || reactId;
  const borderColor = error ? "var(--error)" : focused ? "var(--vino-700)" : "var(--border-input)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width: fullWidth ? "100%" : "auto",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: taId,
    style: {
      display: "block",
      font: "var(--fw-semibold) 13px/1.2 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-secondary)",
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: taId,
    rows: rows,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      resize: "vertical",
      background: disabled ? "#F1F3F5" : "var(--white)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-xs)",
      font: "var(--fw-regular) 14px/1.6 var(--font-sans)",
      color: "var(--text-primary)",
      padding: "11px 12px",
      outline: "none",
      transition: "border-color 150ms ease-out",
      ...style
    }
  }, rest)), helperText && /*#__PURE__*/React.createElement("div", {
    style: {
      font: "var(--fw-medium) 12px/1.3 var(--font-sans)",
      color: error ? "var(--error)" : "var(--text-disabled)",
      marginTop: 5
    }
  }, helperText));
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
/**
 * SOAPAP Breadcrumb — minimal path trail. Separator is a chevron.
 */
function Breadcrumb({
  items = [],
  style = {}
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Ruta de navegaci\xF3n",
    style: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 4,
      ...style
    }
  }, items.map((item, i) => {
    const last = i === items.length - 1;
    const label = typeof item === "string" ? item : item.label;
    const href = typeof item === "object" ? item.href : undefined;
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: i
    }, last ? /*#__PURE__*/React.createElement("span", {
      style: {
        font: "var(--fw-semibold) 13px/1 var(--font-sans)",
        color: "var(--text-primary)"
      },
      "aria-current": "page"
    }, label) : /*#__PURE__*/React.createElement("a", {
      href: href || "#",
      style: {
        font: "var(--fw-medium) 13px/1 var(--font-sans)",
        color: "var(--color-link)",
        textDecoration: "none"
      }
    }, label), !last && /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "Material Symbols Rounded",
        fontSize: 16,
        color: "var(--text-disabled)",
        lineHeight: 1
      }
    }, "chevron_right"));
  }));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/NavItem.jsx
try { (() => {
/**
 * SOAPAP NavItem — sidebar navigation item. Active state = vino bg + bold label.
 */
function NavItem({
  label,
  icon,
  active = false,
  badge,
  onClick,
  href,
  indent = 0,
  style = {}
}) {
  const Tag = href ? "a" : "button";
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    onClick: onClick,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: `10px ${12 + indent * 16}px`,
      background: active ? "var(--vino-050)" : "transparent",
      color: active ? "var(--vino-700)" : "var(--text-secondary)",
      font: `${active ? "var(--fw-bold)" : "var(--fw-medium)"} 14px/1 var(--font-sans)`,
      border: "none",
      borderRadius: "var(--radius-xs)",
      textDecoration: "none",
      cursor: "pointer",
      width: "100%",
      textAlign: "left",
      transition: "background-color 120ms ease-out, color 120ms ease-out",
      boxSizing: "border-box",
      borderLeft: active ? "3px solid var(--vino-700)" : "3px solid transparent",
      ...style
    },
    onMouseEnter: e => !active && (e.currentTarget.style.backgroundColor = "var(--grey-100)"),
    onMouseLeave: e => !active && (e.currentTarget.style.backgroundColor = "transparent")
  }, icon && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "Material Symbols Rounded",
      fontSize: 20,
      lineHeight: 1,
      flexShrink: 0
    }
  }, icon), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, label), badge != null && /*#__PURE__*/React.createElement("span", {
    style: {
      background: "var(--error)",
      color: "var(--white)",
      fontSize: 11,
      fontWeight: 700,
      padding: "2px 7px",
      borderRadius: "var(--radius-pill)",
      lineHeight: 1.4,
      fontFamily: "var(--font-sans)"
    }
  }, badge));
}
Object.assign(__ds_scope, { NavItem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/NavItem.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
/**
 * SOAPAP Pagination — page number row with prev/next.
 */
function Pagination({
  page = 1,
  count = 1,
  onChange,
  style = {}
}) {
  const pages = [];
  const delta = 2;
  const left = Math.max(1, page - delta);
  const right = Math.min(count, page + delta);
  for (let i = left; i <= right; i++) pages.push(i);
  const btnStyle = (active, disabled) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 36,
    borderRadius: "var(--radius-xs)",
    border: "1px solid",
    borderColor: active ? "var(--vino-800)" : "var(--border-hairline)",
    background: active ? "var(--vino-800)" : "var(--white)",
    color: active ? "var(--white)" : disabled ? "var(--text-disabled)" : "var(--text-secondary)",
    font: "var(--fw-semibold) 13px/1 var(--font-sans)",
    cursor: disabled ? "default" : "pointer",
    transition: "background-color 120ms, border-color 120ms",
    fontFamily: "var(--font-sans)"
  });
  const go = p => {
    if (p >= 1 && p <= count && p !== page) onChange && onChange(p);
  };
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Paginaci\xF3n",
    style: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      ...style
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => go(page - 1),
    disabled: page === 1,
    style: {
      ...btnStyle(false, page === 1),
      width: "auto",
      padding: "0 10px",
      fontFamily: "Material Symbols Rounded",
      fontSize: 18
    },
    "aria-label": "Anterior"
  }, "chevron_left"), left > 1 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    style: btnStyle(false, false),
    onClick: () => go(1)
  }, "1"), left > 2 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-disabled)",
      fontFamily: "var(--font-sans)"
    }
  }, "\u2026")), pages.map(p => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => go(p),
    style: btnStyle(p === page, false)
  }, p)), right < count && /*#__PURE__*/React.createElement(React.Fragment, null, right < count - 1 && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-disabled)",
      fontFamily: "var(--font-sans)"
    }
  }, "\u2026"), /*#__PURE__*/React.createElement("button", {
    style: btnStyle(false, false),
    onClick: () => go(count)
  }, count)), /*#__PURE__*/React.createElement("button", {
    onClick: () => go(page + 1),
    disabled: page === count,
    style: {
      ...btnStyle(false, page === count),
      width: "auto",
      padding: "0 10px",
      fontFamily: "Material Symbols Rounded",
      fontSize: 18
    },
    "aria-label": "Siguiente"
  }, "chevron_right"));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * SOAPAP Tabs — gold indicator, underline style. Matches MUI tab spec.
 */
function Tabs({
  tabs = [],
  value,
  onChange,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      borderBottom: "2px solid var(--border-hairline)",
      gap: 0,
      ...style
    }
  }, tabs.map(tab => {
    const key = typeof tab === "string" ? tab : tab.value;
    const label = typeof tab === "string" ? tab : tab.label;
    const active = key === value;
    return /*#__PURE__*/React.createElement("button", {
      key: key,
      onClick: () => onChange && onChange(key),
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "12px 20px",
        font: `var(--fw-semibold) 14px/1 var(--font-sans)`,
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        borderBottom: active ? "2px solid var(--oro-500)" : "2px solid transparent",
        marginBottom: -2,
        transition: "color 150ms ease-out, border-color 150ms ease-out",
        whiteSpace: "nowrap"
      }
    }, label);
  }));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.Chip = __ds_scope.Chip;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Table = __ds_scope.Table;

__ds_ns.Alert = __ds_scope.Alert;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.NavItem = __ds_scope.NavItem;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.Tabs = __ds_scope.Tabs;

})();
