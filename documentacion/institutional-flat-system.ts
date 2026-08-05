// theme.ts
import { createTheme,alpha } from "@mui/material/styles";

// 1. Extendemos Paper porque es el padre mecánico de la propiedad variant
declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides {
    standard: true;
    outstanding:true;
  }
}

// 2. Extendemos Card para asegurar la consistencia del componente final
declare module '@mui/material/Card' {
  interface CardPropsVariantOverrides {
    standard: true;
    outstanding:true;
  }
}


const InstitutionalFlatSystem = createTheme({
  palette: {
    mode: "light",

    primary: {
      main: "#3D0017",
      light: "#5B132B",
      dark: "#2B000F",
      contrastText: "#FFFFFF",
    },

    secondary: {
      main: "#B8822A",
      light: "#D89A2E",
      dark: "#9F7122",
      contrastText: "#FFFFFF",
    },

    error: {
      main: "#BA1A1A",
      light: "#FFEBEE",
      contrastText: "#FFFFFF",
    },

    warning: {
      main: "#C58A00",
      light: "#FFF7E0",
      contrastText: "#191C1E",
    },

    success: {
      main: "#2E7D32",
      light: "#E8F5E9",
      contrastText: "#FFFFFF",
    },

    info: {
      main: "#1565C0",
      light: "#EAF2FD",
      contrastText: "#FFFFFF",
    },

    background: {
      default: "#F8F9FB",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#191C1E",
      secondary: "#544245",
      disabled: "#A7ADB3",
    },

    divider: "#E9ECEF",

    grey: {
      50: "#F8F9FB",
      100: "#F2F4F6",
      200: "#E6E8EA",
      300: "#E0E3E5",
      400: "#D8DADC",
      500: "#A7ADB3",
      900: "#191C1E",
    },
  },

  typography: {
    fontFamily: `"Montserrat", sans-serif`,

    h1: {
      fontSize: "40px",
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: "-0.02em",
    },

    h2: {
      fontSize: "32px",
      fontWeight: 700,
      lineHeight: 1.25,
    },

    h3: {
      fontSize: "24px",
      fontWeight: 700,
      lineHeight: 1.3,
    },

    h4: {
      fontSize: "20px",
      fontWeight: 600,
      lineHeight: 1.4,
    },

    body1: {
      fontSize: "16px",
      lineHeight: 1.6,
      fontWeight: 400,
    },

    body2: {
      fontSize: "14px",
      lineHeight: 1.6,
      fontWeight: 400,
    },

    button: {
      fontWeight: 700,
      textTransform: "none",
      letterSpacing: "0.02em",
    },

    caption: {
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1.2,
    },
  },

  shape: {
    borderRadius: 8,
  },

  spacing: 8,

  shadows: [
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
    "none",
  ],

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F8F9FB",
          color: "#191C1E",
          fontFeatureSettings: '"cv02","cv03","cv04","cv11"',
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },

        "*": {
          boxSizing: "border-box",
        },

        "::selection": {
          backgroundColor: "#5B132B",
          color: "#FFFFFF",
        },
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #E9ECEF",
          boxShadow: "none",
        },
      },
    },






    MuiCard: {
      styleOverrides: {
        root: {
          
          backgroundImage: "none",
          border: "1px solid #E9ECEF",
          boxShadow: "none",
          borderRadius: 8,
          padding: 8,
        },
      },variants: [
        {
          props: {
            variant: "standard",
          },
          style: {
            borderLeft: '10px solid #5B132B',
            "&:hover": {
              borderLeft: '10px solid #9F7122',
              backgroundColor:'#F8F9FB',
              //400: "#D8DADC", 500: "#A7ADB3",
            },
            "&:active": {
              borderLeft: '10px solid #9F7122',
              backgroundColor:'#F8F9FB',
            },
          },
        },
        {
          props: {
            variant: "outstanding",
          },
          style: {
            borderLeft: '10px solid #B8822A',
            "&:hover": {
              borderLeft: '10px solid #9F7122',
              backgroundColor:'#F2F4F6',
            },
            "&:active": {
              borderLeft: '10px solid #9F7122',
              backgroundColor:'#F2F4F6',
            },
          },
        },
      ],
    },









    MuiButton: {
  styleOverrides: {
    root: {
      borderRadius: 4,
      boxShadow: "none",
      padding: "10px 18px",
      transition: "all 180ms ease-out",

      "&:hover": {
        boxShadow: "none",
      },
    },
  },

  variants: [
    {
      props: {
        variant: "contained",
        color: "primary",
      },

      style: {
        backgroundColor: "#3D0017",
        color: "#FFFFFF",

        "&:hover": {
          backgroundColor: "#5B132B",
        },

        "&:active": {
          backgroundColor: "#2B000F",
        },
      },
    },

    {
      props: {
        variant: "contained",
        color: "secondary",
      },

      style: {
        backgroundColor: "#B8822A",
        color: "#FFFFFF",

        "&:hover": {
          backgroundColor: "#D89A2E",
        },

        "&:active": {
          backgroundColor: "#9F7122",
        },
      },
    },

    {
      props: {
        variant: "outlined",
      },

      style: {
        border: "1px solid #5B132B",
        color: "#5B132B",

        "&:hover": {
          backgroundColor: "#F8F1F3",
          border: "1px solid #5B132B",
        },
      },
    },

    {
      props: {
        variant: "text",
      },

      style: {
        color: "#5B132B",

        "&:hover": {
          backgroundColor: "transparent",
          color: "#7A203D",
        },
      },
    },
  ],
},

    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },

    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
          borderRadius: 4,

          "& fieldset": {
            borderColor: "#D8DADC",
          },

          "&:hover fieldset": {
            borderColor: "#5B132B",
          },

          "&.Mui-focused fieldset": {
            borderColor: "#5B132B",
            borderWidth: "1px",
          },

          "&.Mui-disabled": {
            backgroundColor: "#F1F3F5",
          },
        },

        input: {
          padding: "12px 14px",
        },
      },
    },

    MuiTableContainer: {
      styleOverrides: {
        root: {
          border: "1px solid #E9ECEF",
          borderRadius: 8,
          boxShadow: "none",
        },
      },
    },

    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: "#FFFFFF",
        },
      },
    },

    MuiTableCell: {
      styleOverrides: {
        head: {
          borderBottom: "1px solid #E9ECEF",
          fontWeight: 700,
          color: "#191C1E",
        },

        body: {
          borderBottom: "1px solid #F2F4F6",
        },
      },
    },

    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:nth-of-type(even)": {
            backgroundColor: "#F8F9FB",
          },

          "&:hover": {
            backgroundColor: "#F2F4F6",
          },
        },
      },
    },

    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: "#B8822A",
          height: 2,
        },
      },
    },

    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          minHeight: 48,
          fontWeight: 600,
          color: "#544245",

          "&.Mui-selected": {
            color: "#191C1E",
          },
        },
      },
    },

    MuiAlert: {
  styleOverrides: {
    root: {
      borderRadius: 8,
      border: "1px solid",
      boxShadow: "none",
    },
  },

  variants: [
    {
      props: {
        severity: "success",
      },

      style: {
        backgroundColor: "#E8F5E9",
        borderColor: "#C8E6C9",
        color: "#2E7D32",
      },
    },

    {
      props: {
        severity: "warning",
      },

      style: {
        backgroundColor: "#FFF7E0",
        borderColor: "#F0D89A",
        color: "#C58A00",
      },
    },

    {
      props: {
        severity: "error",
      },

      style: {
        backgroundColor: "#FFEBEE",
        borderColor: "#F5C2C7",
        color: "#BA1A1A",
      },
    },

    {
      props: {
        severity: "info",
      },

      style: {
        backgroundColor: "#EAF2FD",
        borderColor: "#C9DDF8",
        color: "#1565C0",
      },
    },
  ],
},

    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
          fontWeight: 600,
        },
      },
    },

    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "#E9ECEF",
        },
      },
    },

    MuiLink: {
      styleOverrides: {
        root: {
          color: "#5B132B",
          textDecoration: "none",
          fontWeight: 600,

          "&:hover": {
            color: "#7A203D",
            textDecoration: "underline",
          },

          "&:visited": {
            color: "#8B5A6B",
          },
        },
      },
    },

    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: "#FFFFFF",
          borderRight: "1px solid #E9ECEF",
          boxShadow: "none",
        },
      },
    },

    MuiAppBar: {
      defaultProps: {
        // Establece el comportamiento base para evitar repetirlo en el componente
        elevation: 0, 
        position: 'sticky',
        color: 'inherit', 
        
      },
      styleOverrides: {

        root: ({ theme }) => ({
          // CORRECCIÓN: Una sola declaración de backgroundColor utilizando 'alpha'
          // Inyectamos un 90% de opacidad al color base del tema
          // 1. Efecto Isla Flotante
          //width: {xs:'100%',md:'50%'},
          marginInline: 'auto',
          marginTop: '20px', // Lo separa físicamente del techo al inicio
          top: '20px',       // Mantiene esa separación de 20px al hacer scroll
          
          // 2. Estética de la Isla
          borderRadius: '12px', // Curvatura más pronunciada para el efecto flotante
          border: `1px solid ${theme.palette.divider}`, // Borde en los 4 lados


          // Efecto Cristal (Glassmorphism)
          backgroundColor: alpha(theme.palette.primary.light, 0.95), 
          color: "primary.contrastText",
          
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          transition: theme.transitions.create(['background-color', 'border-color'], {
            duration: theme.transitions.duration.standard,
          }),
        }),

      }
    },
    

    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: "#191C1E",
          borderRadius: 4,
          fontSize: "12px",
        },
      },
    },

  },
});


export default InstitutionalFlatSystem;