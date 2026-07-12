/* @ds-bundle: {"format":4,"namespace":"OEKOBITDesignSystem_6b83f0","components":[],"sourceHashes":{"ui_kits/website/ContentBlocks.jsx":"58fb0f3362a1","ui_kits/website/NavSidebar.jsx":"7e83f898d023","ui_kits/website/Pages.jsx":"b0535bc2e0c8","ui_kits/website/Primitives.jsx":"6011806bbf12"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OEKOBITDesignSystem_6b83f0 = window.OEKOBITDesignSystem_6b83f0 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/website/ContentBlocks.jsx
try { (() => {
/* eslint-disable no-undef */
// OEKOBIT — content blocks: Imagebox, InfoboxIcon, SectionHeadline.

const Imagebox = ({
  image,
  label,
  light = false,
  onClick
}) => {
  const [hover, setHover] = React.useState(false);
  const footerBg = hover ? "#F0F1F1" : light ? "#FAFAFA" : "#F4F5F5";
  const textColor = hover ? "#576164" : "#798183";
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      width: "100%",
      borderRadius: 12,
      overflow: "hidden",
      cursor: onClick ? "pointer" : "default",
      transition: "transform 200ms"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      aspectRatio: "352/228",
      background: `url(${image}) center/cover no-repeat`,
      borderRadius: "12px 12px 0 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: footerBg,
      padding: "28px 32px",
      display: "flex",
      alignItems: "center",
      gap: 24,
      borderRadius: "0 0 12px 12px",
      transition: "background 200ms"
    }
  }, /*#__PURE__*/React.createElement(ChevronCircle, {
    size: 32,
    color: textColor
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "Mulish, sans-serif",
      fontSize: 18,
      color: textColor,
      transition: "color 200ms"
    }
  }, label)));
};

// One of: 'substrate' | 'industrie' | 'landwirtschaft' | 'gasnutzung'
const InfoIcon = ({
  kind = "substrate",
  size = 48,
  color = "#798183"
}) => {
  const stroke = 1.2;
  const inner = (() => {
    switch (kind) {
      case "industrie":
        return /*#__PURE__*/React.createElement("g", {
          stroke: color,
          fill: "none",
          strokeWidth: stroke
        }, /*#__PURE__*/React.createElement("rect", {
          x: "13",
          y: "22",
          width: "7",
          height: "12"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "20",
          y: "14",
          width: "8",
          height: "20"
        }), /*#__PURE__*/React.createElement("rect", {
          x: "28",
          y: "20",
          width: "7",
          height: "14"
        }), /*#__PURE__*/React.createElement("line", {
          x1: "22",
          y1: "18",
          x2: "22",
          y2: "18"
        }));
      case "landwirtschaft":
        return /*#__PURE__*/React.createElement("g", {
          stroke: color,
          fill: "none",
          strokeWidth: stroke
        }, /*#__PURE__*/React.createElement("circle", {
          cx: "18",
          cy: "32",
          r: "4"
        }), /*#__PURE__*/React.createElement("circle", {
          cx: "32",
          cy: "32",
          r: "4"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M14 32 L14 22 L25 22 L29 28 L36 28 L36 32"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M16 22 L16 16 L23 16 L23 22"
        }));
      case "gasnutzung":
        return /*#__PURE__*/React.createElement("g", {
          stroke: color,
          fill: "none",
          strokeWidth: stroke
        }, /*#__PURE__*/React.createElement("path", {
          d: "M24 14 C20 18 19 22 22 26 C26 30 28 26 28 22 C28 18 24 14 24 14 Z"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M24 18 C22 20 22 22 24 24"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M14 32 L34 32"
        }));
      case "substrate":
      default:
        return /*#__PURE__*/React.createElement("g", {
          stroke: color,
          fill: "none",
          strokeWidth: stroke
        }, /*#__PURE__*/React.createElement("path", {
          d: "M24 14 C20 18 18 22 18 28 C18 32 21 35 24 35"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M24 14 C28 18 30 22 30 28 C30 32 27 35 24 35"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M24 35 L24 22"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M21 24 L24 26 L27 24"
        }), /*#__PURE__*/React.createElement("path", {
          d: "M21 28 L24 30 L27 28"
        }));
    }
  })();
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 48 48",
    "aria-hidden": true,
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "24",
    cy: "24",
    r: "23.5",
    fill: "none",
    stroke: color,
    strokeWidth: "0.8"
  }), inner);
};
const InfoboxIcon = ({
  kind,
  eyebrow,
  body,
  light = false
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    borderRadius: 12,
    background: light ? "#FAFAFA" : "#F4F5F5",
    padding: 48,
    display: "flex",
    gap: 32,
    width: "100%",
    boxSizing: "border-box"
  }
}, /*#__PURE__*/React.createElement(InfoIcon, {
  kind: kind
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
    flex: 1
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: light ? 400 : 300,
    fontSize: 20,
    lineHeight: 1,
    color: "#798183"
  }
}, eyebrow), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.4,
    color: "#798183"
  }
}, body)));
const SectionHeadline = ({
  kicker,
  title,
  body,
  withTrennlinie
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    maxWidth: 740
  }
}, withTrennlinie && /*#__PURE__*/React.createElement(Trennlinie, {
  style: {
    marginBottom: 32
  }
}), kicker && /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 20,
    color: "#798183",
    marginBottom: 16
  }
}, kicker), /*#__PURE__*/React.createElement("h2", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 400,
    fontSize: 30,
    lineHeight: 1.1,
    letterSpacing: "-0.01em",
    color: "#576164",
    margin: 0,
    marginBottom: 32
  }
}, title), body && /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 400,
    fontSize: 18,
    lineHeight: 1.8,
    color: "#798183",
    margin: 0
  }
}, body));
Object.assign(window, {
  Imagebox,
  InfoboxIcon,
  InfoIcon,
  SectionHeadline
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/ContentBlocks.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/NavSidebar.jsx
try { (() => {
/* eslint-disable no-undef */
// OEKOBIT — left navigation sidebar (~395px wide).
// Sticky in the layout; logo + tools + main menu.

const NAV_ITEMS = [{
  id: "home",
  label: "Startseite"
}, {
  id: "anlagensysteme",
  label: "Anlagensysteme"
}, {
  id: "anlagentechnik",
  label: "Anlagentechnik"
}, {
  id: "service",
  label: "Service"
}, {
  id: "karriere",
  label: "Karriere"
}, {
  id: "aktuelles",
  label: "Aktuelles"
}];
const TOOL_ITEMS = [{
  id: "gruppe",
  label: "Gruppe",
  icon: "group"
}, {
  id: "kontakt",
  label: "Kontakt",
  icon: "mail"
}, {
  id: "sprache",
  label: "DE / EN",
  icon: "globe"
}, {
  id: "anfrage",
  label: "Anfrage",
  icon: "send"
}];
const ToolIcon = ({
  kind,
  color = "#798183"
}) => {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };
  switch (kind) {
    case "group":
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "9",
        cy: "9",
        r: "3"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "17",
        cy: "11",
        r: "2.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 19c0-3 3-5 6-5s6 2 6 5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M14 18c0-2 2-3.5 4-3.5s4 1.5 4 3.5"
      }));
    case "mail":
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("rect", {
        x: "3",
        y: "6",
        width: "18",
        height: "13",
        rx: "1.5"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 8 L12 14 L21 8"
      }));
    case "globe":
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("circle", {
        cx: "12",
        cy: "12",
        r: "9"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M3 12h18"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M12 3 c3 3 3 15 0 18 c-3 -3 -3 -15 0 -18"
      }));
    case "send":
      return /*#__PURE__*/React.createElement("svg", props, /*#__PURE__*/React.createElement("path", {
        d: "M21 3 L3 11 L11 13 L13 21 Z"
      }), /*#__PURE__*/React.createElement("path", {
        d: "M21 3 L11 13"
      }));
    default:
      return null;
  }
};
const NavSidebar = ({
  active,
  onNavigate
}) => {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 395,
      flexShrink: 0,
      position: "sticky",
      top: 64,
      alignSelf: "flex-start",
      padding: "64px 32px 32px 64px",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => onNavigate("home"),
    style: {
      appearance: "none",
      background: "none",
      border: 0,
      padding: 0,
      cursor: "pointer",
      display: "block",
      marginBottom: 56
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/logo-oekobit.png",
    alt: "OEKOBIT Deutschland",
    style: {
      width: 260,
      height: "auto",
      display: "block"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      marginBottom: 40,
      paddingBottom: 24
    }
  }, TOOL_ITEMS.map(t => /*#__PURE__*/React.createElement(ToolButton, {
    key: t.id,
    item: t,
    onClick: () => onNavigate(t.id),
    active: active === t.id
  }))), /*#__PURE__*/React.createElement(Trennlinie, {
    width: 200,
    style: {
      marginBottom: 40
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 0
    }
  }, NAV_ITEMS.map(n => /*#__PURE__*/React.createElement(NavLink, {
    key: n.id,
    label: n.label,
    active: active === n.id,
    onClick: () => onNavigate(n.id)
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 56
    }
  }, /*#__PURE__*/React.createElement(ButtonBlau, {
    onClick: () => onNavigate("anfrage")
  }, "Biogas-Schnellanfrage")));
};
const ToolButton = ({
  item,
  onClick,
  active
}) => {
  const [hover, setHover] = React.useState(false);
  const isOn = active || hover;
  const color = isOn ? "#576164" : "#798183";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      appearance: "none",
      background: "none",
      border: 0,
      padding: "10px 0",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 14,
      color,
      fontFamily: "Mulish, sans-serif",
      fontSize: 16,
      textAlign: "left",
      transition: "color 200ms"
    }
  }, /*#__PURE__*/React.createElement(ToolIcon, {
    kind: item.icon,
    color: color
  }), /*#__PURE__*/React.createElement("span", null, item.label));
};
const NavLink = ({
  label,
  active,
  onClick
}) => {
  const [hover, setHover] = React.useState(false);
  const isOn = active || hover;
  const color = isOn ? "#576164" : "#798183";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      appearance: "none",
      background: "none",
      border: 0,
      borderBottom: "1px solid #DDDFE0",
      padding: "14px 0",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: 14,
      color,
      fontFamily: "Mulish, sans-serif",
      fontSize: 16,
      textAlign: "left",
      transition: "color 200ms"
    }
  }, /*#__PURE__*/React.createElement(ChevronCircle, {
    size: 14,
    color: color,
    strokeWidth: 1
  }), /*#__PURE__*/React.createElement("span", null, label));
};
Object.assign(window, {
  NavSidebar
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/NavSidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Pages.jsx
try { (() => {
/* eslint-disable no-undef */
// OEKOBIT — pages: Home, Anlagensysteme, Gruppe.

const PageFrame = ({
  children
}) => /*#__PURE__*/React.createElement("main", {
  style: {
    flex: 1,
    borderRadius: 25,
    padding: "64px 0",
    paddingRight: 64,
    boxSizing: "border-box",
    minWidth: 0
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 96
  }
}, children));
const HeroPanel = ({
  title,
  body,
  image,
  kicker
}) => /*#__PURE__*/React.createElement("section", {
  style: {
    borderRadius: 18,
    background: "#FAFAFA",
    padding: "96px 96px 96px 96px",
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 64,
    alignItems: "center",
    minHeight: 540,
    boxSizing: "border-box"
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Trennlinie, {
  style: {
    marginBottom: 32
  }
}), kicker && /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 20,
    color: "#798183",
    marginBottom: 24
  }
}, kicker), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    color: "#576164",
    margin: 0,
    marginBottom: 32,
    maxWidth: 520
  }
}, title), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontSize: 18,
    lineHeight: 1.8,
    color: "#798183",
    margin: 0,
    marginBottom: 48,
    maxWidth: 540
  }
}, body), /*#__PURE__*/React.createElement(ButtonGrauIcon, {
  iconRight: true
}, "Mehr erfahren")), /*#__PURE__*/React.createElement("div", {
  style: {
    width: "100%",
    height: "100%",
    minHeight: 360,
    borderRadius: 16,
    background: `url(${image}) center/cover no-repeat`
  }
}));

// Page: Home — landing
const HomePage = ({
  onNavigate
}) => /*#__PURE__*/React.createElement(PageFrame, null, /*#__PURE__*/React.createElement(HeroPanel, {
  kicker: "OEKOBIT Deutschland",
  title: "Wir entwickeln hochpr\xE4zise Biogasanlagen.",
  body: "Als f\xFChrende Experten in den Bereichen Biogas, Biomethan und kommunale Wasserwirtschaft steht die OEKOBIT GROUP f\xFCr wegweisende Energiel\xF6sungen und die Entwicklung nachhaltiger Infrastrukturprojekte.",
  image: "../../assets/biogas-anlage-hero.jpg"
}), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHeadline, {
  withTrennlinie: true,
  title: "Unsere Anlagensysteme.",
  body: "Substratoptimierte L\xF6sungen f\xFCr Landwirtschaft, Industrie und kommunale Verwertung \u2014 von der Hofbiogasanlage bis zur Biomethaneinspeisung."
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 24,
    marginTop: 64
  }
}, /*#__PURE__*/React.createElement(Imagebox, {
  image: "../../assets/biogas-anlage-1.png",
  label: "Landwirtschaftliche Biogasanlagen",
  onClick: () => onNavigate("anlagensysteme")
}), /*#__PURE__*/React.createElement(Imagebox, {
  image: "../../assets/biogas-anlage-2.png",
  label: "Industrielle Biogasanlagen",
  light: true,
  onClick: () => onNavigate("anlagensysteme")
}), /*#__PURE__*/React.createElement(Imagebox, {
  image: "../../assets/biogas-anlage-3.png",
  label: "Biomethananlagen",
  onClick: () => onNavigate("anlagensysteme")
}))), /*#__PURE__*/React.createElement("section", {
  style: {
    background: "#FAFAFA",
    borderRadius: 18,
    padding: "96px 96px",
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 64,
    alignItems: "center"
  }
}, /*#__PURE__*/React.createElement(SectionHeadline, {
  title: "OEKOBIT Deutschland ist Teil der OEKOBIT GROUP",
  body: "Mit fortschrittlichen Technologien und individuell zugeschnittenen Konzepten setzen wir uns aktiv f\xFCr \xF6kologische Nachhaltigkeit ein. Unsere technische Expertise und unser Innovationsgeist sind die treibenden Kr\xE4fte hinter den zukunftsf\xE4higen Energiel\xF6sungen, die wir f\xFCr die Welt von morgen gestalten."
}), /*#__PURE__*/React.createElement(Zitat, {
  width: 300
}, "\"Mit Pioniergeist und Expertise entwickeln wir nachhaltige Energiel\xF6sungen von morgen\"")), /*#__PURE__*/React.createElement("section", {
  style: {
    display: "flex",
    justifyContent: "center",
    padding: "32px 0 64px"
  }
}, /*#__PURE__*/React.createElement(ButtonBlau, {
  onClick: () => onNavigate("anfrage")
}, "Jetzt Biogas-Anfrage senden")));

// Page: Anlagensysteme — detail
const AnlagensystemePage = () => /*#__PURE__*/React.createElement(PageFrame, null, /*#__PURE__*/React.createElement("section", {
  style: {
    borderRadius: 18,
    background: "#FAFAFA",
    padding: "96px 96px"
  }
}, /*#__PURE__*/React.createElement(Trennlinie, {
  style: {
    marginBottom: 32
  }
}), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    color: "#576164",
    margin: 0,
    marginBottom: 32,
    maxWidth: 760
  }
}, "Anlagensysteme."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontSize: 18,
    lineHeight: 1.8,
    color: "#798183",
    margin: 0,
    maxWidth: 760
  }
}, "OEKOBIT plant und baut Biogas- und Biomethananlagen, die exakt auf Ihren Substrateinsatz, Ihre Standortbedingungen und Ihre Gasnutzung zugeschnitten sind. W\xE4hlen Sie das passende Anlagensystem f\xFCr Ihren Betrieb.")), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHeadline, {
  withTrennlinie: true,
  title: /*#__PURE__*/React.createElement(React.Fragment, null, "Industrielle Biogasanlagen:", /*#__PURE__*/React.createElement("br", null), "Substratoptimierte Anlagen f\xFCr Industrieprozesse und Verfahren."),
  body: "Industrielle Biogasanlagen sind die perfekte L\xF6sung f\xFCr Industrieunternehmen und Produktionsbetriebe, die ihre Prozesse und Verfahren optimieren m\xF6chten. Diese Anlagen sind speziell darauf ausgelegt, alle passenden Substrate, die in den industriellen Prozessen anfallen, effizient zu verwerten."
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginTop: 64
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24
  }
}, /*#__PURE__*/React.createElement(InfoboxIcon, {
  kind: "industrie",
  eyebrow: "Ideal f\xFCr:",
  body: "Industrieunternehmen, Produktionsbetriebe, Lebensmittelverarbeiter, Schlachtbetriebe."
}), /*#__PURE__*/React.createElement(InfoboxIcon, {
  light: true,
  kind: "substrate",
  eyebrow: "Typische Substrate:",
  body: "Nachwachsende Rohstoffe, G\xFClle, Mist, Abfallstoffe, Restm\xFCll, Schlachtabf\xE4lle."
}), /*#__PURE__*/React.createElement(InfoboxIcon, {
  kind: "gasnutzung",
  eyebrow: "M\xF6gliche Gasnutzung:",
  body: "Strom, W\xE4rme, Biomethan-Einspeisung ins Gasnetz, Verfl\xFCssigung."
})), /*#__PURE__*/React.createElement("div", {
  style: {
    borderRadius: 16,
    background: "url(../../assets/biogas-anlage-2.png) center/cover no-repeat",
    minHeight: 360
  }
}))), /*#__PURE__*/React.createElement("section", null, /*#__PURE__*/React.createElement(SectionHeadline, {
  withTrennlinie: true,
  title: /*#__PURE__*/React.createElement(React.Fragment, null, "Landwirtschaftliche Biogasanlagen:", /*#__PURE__*/React.createElement("br", null), "Energie aus Hofreststoffen und nachwachsenden Rohstoffen."),
  body: "Vom Familienbetrieb bis zum gro\xDFen landwirtschaftlichen Verbund \u2014 unsere landwirtschaftlichen Anlagen verwerten G\xFClle, Mist und nachwachsende Rohstoffe wirtschaftlich und zuverl\xE4ssig."
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 24,
    marginTop: 64
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    borderRadius: 16,
    background: "url(../../assets/biogas-anlage-3.png) center/cover no-repeat",
    minHeight: 360
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24
  }
}, /*#__PURE__*/React.createElement(InfoboxIcon, {
  kind: "landwirtschaft",
  eyebrow: "Ideal f\xFCr:",
  body: "Landwirtschaftliche Betriebe, Verb\xFCnde, Hofgemeinschaften."
}), /*#__PURE__*/React.createElement(InfoboxIcon, {
  light: true,
  kind: "substrate",
  eyebrow: "Typische Substrate:",
  body: "G\xFClle, Mist, Maissilage, Grassilage, nachwachsende Rohstoffe."
}), /*#__PURE__*/React.createElement(InfoboxIcon, {
  kind: "gasnutzung",
  eyebrow: "M\xF6gliche Gasnutzung:",
  body: "BHKW-Verstromung, W\xE4rme, Hofversorgung, Direktvermarktung."
})))));

// Page: Gruppe — about / company family
const GruppePage = () => /*#__PURE__*/React.createElement(PageFrame, null, /*#__PURE__*/React.createElement("section", {
  style: {
    borderRadius: 18,
    background: "#FAFAFA",
    padding: "96px 96px"
  }
}, /*#__PURE__*/React.createElement(Trennlinie, {
  style: {
    marginBottom: 32
  }
}), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    color: "#576164",
    margin: 0,
    marginBottom: 32,
    maxWidth: 760
  }
}, "OEKOBIT GROUP."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontSize: 18,
    lineHeight: 1.8,
    color: "#798183",
    margin: 0,
    maxWidth: 760
  }
}, "Als f\xFChrende Experten in den Bereichen Biogas, Biomethan und kommunale Wasserwirtschaft steht die OEKOBIT GROUP f\xFCr wegweisende Energiel\xF6sungen und die Entwicklung nachhaltiger Infrastrukturprojekte. Mit fortschrittlichen Technologien und individuell zugeschnittenen Konzepten setzen wir uns aktiv f\xFCr \xF6kologische Nachhaltigkeit ein.")), /*#__PURE__*/React.createElement("section", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 48,
    alignItems: "center",
    padding: "32px 0"
  }
}, /*#__PURE__*/React.createElement(SectionHeadline, {
  withTrennlinie: true,
  title: "Eine Familie aus drei Gesch\xE4ftsfeldern."
}), /*#__PURE__*/React.createElement("img", {
  src: "../../assets/oekobit-group-map.png",
  alt: "OEKOBIT GROUP family",
  style: {
    maxWidth: 900,
    width: "100%",
    height: "auto"
  }
})), /*#__PURE__*/React.createElement("section", {
  style: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 96,
    alignItems: "center",
    background: "#FAFAFA",
    borderRadius: 18,
    padding: "96px"
  }
}, /*#__PURE__*/React.createElement(SectionHeadline, {
  title: "OEKOBIT Deutschland: Planung und Bau von Biogas- und Biomethananlagen in Deutschland und Benelux",
  body: "Unsere technische Expertise und unser Innovationsgeist sind die treibenden Kr\xE4fte hinter den zukunftsf\xE4higen Energiel\xF6sungen, die wir f\xFCr die Welt von morgen gestalten."
}), /*#__PURE__*/React.createElement(Zitat, {
  width: 300
}, "\"Mit Pioniergeist und Expertise entwickeln wir nachhaltige Energiel\xF6sungen von morgen\"")));

// Generic stub for routes that aren't fleshed out
const StubPage = ({
  title
}) => /*#__PURE__*/React.createElement(PageFrame, null, /*#__PURE__*/React.createElement("section", {
  style: {
    borderRadius: 18,
    background: "#FAFAFA",
    padding: "96px 96px",
    minHeight: 480
  }
}, /*#__PURE__*/React.createElement(Trennlinie, {
  style: {
    marginBottom: 32
  }
}), /*#__PURE__*/React.createElement("h1", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 48,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    color: "#576164",
    margin: 0,
    marginBottom: 32
  }
}, title, "."), /*#__PURE__*/React.createElement("p", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontSize: 18,
    lineHeight: 1.8,
    color: "#798183",
    margin: 0,
    maxWidth: 700
  }
}, "Diese Seite ist ein Platzhalter \u2014 der Figma-Quelle entsprechende Inhalte liegen aktuell nicht vor.")));
Object.assign(window, {
  HomePage,
  AnlagensystemePage,
  GruppePage,
  StubPage,
  PageFrame,
  HeroPanel
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Pages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/website/Primitives.jsx
try { (() => {
/* eslint-disable no-undef */
// OEKOBIT — small reusable primitives.
// All components register on window so other Babel scripts can pick them up.

const Trennlinie = ({
  width = 200,
  style
}) => /*#__PURE__*/React.createElement("div", {
  "aria-hidden": true,
  style: {
    width,
    height: 1,
    background: "linear-gradient(90deg,#95C11F 0%,#5AC24D 14%,#00BE74 28%,#00B997 41%,#00B1B3 56%,#00A7C6 70%,#009BCE 84%,#008ECA 100%)",
    ...style
  }
});
const ChevronCircle = ({
  size = 32,
  color = "#798183",
  strokeWidth = 1.2
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    width: size,
    height: size,
    borderRadius: "50%",
    border: `${strokeWidth}px solid ${color}`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color
  }
}, /*#__PURE__*/React.createElement("svg", {
  width: size * 0.4,
  height: size * 0.5,
  viewBox: "0 0 14 14",
  "aria-hidden": true
}, /*#__PURE__*/React.createElement("polyline", {
  points: "5,2 10,7 5,12",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.4",
  strokeLinecap: "round",
  strokeLinejoin: "round"
})));

// Button — Grau (text-only, big tile)
const ButtonGrau = ({
  children,
  size = "md",
  onClick,
  style
}) => {
  const padding = size === "lg" ? "32px 48px" : size === "sm" ? "16px 24px" : "24px 32px";
  const fs = size === "sm" ? 16 : 18;
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      appearance: "none",
      border: 0,
      cursor: "pointer",
      fontFamily: "Mulish, sans-serif",
      fontSize: fs,
      lineHeight: 1,
      color: hover ? "#576164" : "#798183",
      background: hover ? "#F0F1F1" : "#F4F5F5",
      borderRadius: 12,
      padding,
      transition: "background 200ms, color 200ms",
      ...style
    }
  }, children);
};

// Button — Medium with circle-arrow icon
const ButtonGrauIcon = ({
  children,
  onClick,
  style,
  iconRight = false
}) => {
  const [hover, setHover] = React.useState(false);
  const color = hover ? "#576164" : "#798183";
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      appearance: "none",
      border: 0,
      cursor: "pointer",
      fontFamily: "Mulish, sans-serif",
      fontSize: 18,
      lineHeight: 1,
      color,
      background: hover ? "#F0F1F1" : "#F4F5F5",
      borderRadius: 12,
      padding: "20px 28px",
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      transition: "background 200ms, color 200ms",
      ...style
    }
  }, !iconRight && /*#__PURE__*/React.createElement(ChevronCircle, {
    size: 28,
    color: color
  }), /*#__PURE__*/React.createElement("span", null, children), iconRight && /*#__PURE__*/React.createElement(ChevronCircle, {
    size: 28,
    color: color
  }));
};

// Button — Large Blau (primary CTA)
const ButtonBlau = ({
  children,
  onClick,
  style
}) => {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      appearance: "none",
      border: 0,
      cursor: "pointer",
      fontFamily: "Mulish, sans-serif",
      fontWeight: hover ? 300 : 400,
      fontSize: hover ? 20 : 18,
      lineHeight: 1,
      color: "#fff",
      background: hover ? "linear-gradient(180deg,#64BBE0 0%,#CCE9F5 100%)" : "#B8D5E5",
      borderRadius: 12,
      padding: "30px 44px",
      display: "inline-flex",
      alignItems: "center",
      gap: 24,
      transition: "background 200ms, font-weight 200ms, font-size 200ms, color 200ms",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 44,
      height: 44,
      borderRadius: "50%",
      border: "1.5px solid #fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "20",
    viewBox: "0 0 14 14",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("polyline", {
    points: "5,2 10,7 5,12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("span", null, children));
};

// Zitat — pull quote framed by two gradient lines
const Zitat = ({
  children,
  width = 320
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    width
  }
}, /*#__PURE__*/React.createElement(Trennlinie, null), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: "Mulish, sans-serif",
    fontWeight: 300,
    fontSize: 25,
    lineHeight: 1.05,
    letterSpacing: "-0.01em",
    color: "#798183"
  }
}, children), /*#__PURE__*/React.createElement(Trennlinie, null));
Object.assign(window, {
  Trennlinie,
  ChevronCircle,
  ButtonGrau,
  ButtonGrauIcon,
  ButtonBlau,
  Zitat
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/website/Primitives.jsx", error: String((e && e.message) || e) }); }

})();
