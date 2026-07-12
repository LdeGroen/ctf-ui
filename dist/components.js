// Gedeelde UI-componenten voor de CTF web-apps. De markup komt rechtstreeks
// uit de bestaande apps (wieiswie/makers/cafes voor de display-familie,
// veiligheid/stamgast/vrijwilligersformulier voor de formulieren-familie),
// zodat adoptie géén visuele verandering is.

import React, { useState } from 'react';
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const CTF_GREEN = '#20747F';
export const CTF_BLUE = '#78b5e3';

// ---------------------------------------------------------------- AppShell
// De standaard pagina-wrapper van de display-apps: CTF-groene achtergrond,
// logo rechtsboven (verbergt zichzelf als het bestand mist), gecentreerde titel.
export const AppShell = ({
  title,
  logoSrc,
  children
}) => /*#__PURE__*/_jsx("div", {
  className: "min-h-screen w-full font-sans",
  style: {
    backgroundColor: CTF_GREEN
  },
  children: /*#__PURE__*/_jsxs("div", {
    className: "relative container mx-auto px-4 sm:px-6 lg:px-8 py-8",
    children: [/*#__PURE__*/_jsx("header", {
      className: "absolute top-4 right-4 h-16 sm:h-20 z-20",
      children: /*#__PURE__*/_jsx("img", {
        src: logoSrc || `${typeof process !== 'undefined' && process.env && process.env.PUBLIC_URL || ''}/logo.png`,
        alt: "Caf\xE9 Theater Festival Logo",
        className: "h-full w-auto",
        onError: e => {
          e.target.style.display = 'none';
        }
      })
    }), title && /*#__PURE__*/_jsx("div", {
      className: "text-center mb-8 pt-12",
      children: /*#__PURE__*/_jsx("h1", {
        className: "text-4xl sm:text-5xl font-bold text-white tracking-tight",
        children: title
      })
    }), children]
  })
});

// ------------------------------------------------------------ StatusMessage
// Laad-/fout-/leegtekst zoals de display-apps die tonen.
// <StatusMessage>Bezig met laden…</StatusMessage>
// <StatusMessage error>Kon makers niet laden: {error}</StatusMessage>
export const StatusMessage = ({
  error = false,
  children
}) => /*#__PURE__*/_jsx("p", {
  className: `text-center ${error ? 'text-red-200' : 'text-white/80'}`,
  children: children
});

// -------------------------------------------------------------- SelectorNav
// De jaar/stad-pillen-navigatie (identiek in makers en cafes).
// items: array van strings; value/onChange: geselecteerde waarde.
export const SelectorNav = ({
  items,
  value,
  onChange,
  accent = CTF_BLUE
}) => /*#__PURE__*/_jsx("nav", {
  className: "flex justify-center flex-wrap gap-3 sm:gap-4 mb-10",
  children: items.map(item => /*#__PURE__*/_jsx("button", {
    onClick: () => onChange(item),
    className: `px-6 py-3 text-lg font-semibold rounded-lg shadow-md transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#20747F] focus:ring-white ${value === item ? 'bg-white text-[#20747F]' : 'text-white'}`,
    style: {
      backgroundColor: value !== item ? accent : ''
    },
    children: item
  }, item))
});

// ------------------------------------------------------------ CardGrid/Card
// Het kaartgrid + de kaart met beeld-fallback en titelbalk (makers ≡ cafes).
export const CardGrid = ({
  children
}) => /*#__PURE__*/_jsx("div", {
  className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8",
  children: children
});
export const Card = ({
  href,
  image,
  title,
  imageAlt,
  fallbackText = 'Geen foto',
  errorText = 'Beeld niet beschikbaar',
  accent = CTF_BLUE
}) => {
  const placeholder = text => `https://placehold.co/600x400/20747F/FFFFFF?text=${encodeURIComponent(text)}`;
  return /*#__PURE__*/_jsxs("a", {
    href: href,
    target: "_blank",
    rel: "noopener noreferrer",
    className: "group block bg-white/10 rounded-lg overflow-hidden shadow-lg transition-transform transform hover:-translate-y-2 hover:shadow-2xl",
    children: [/*#__PURE__*/_jsx("div", {
      className: "aspect-w-4 aspect-h-3",
      children: /*#__PURE__*/_jsx("img", {
        src: image || placeholder(fallbackText),
        alt: imageAlt || title,
        className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-110",
        onError: e => {
          e.target.onerror = null;
          e.target.src = placeholder(errorText);
        }
      })
    }), /*#__PURE__*/_jsx("div", {
      className: "p-4",
      style: {
        backgroundColor: accent
      },
      children: /*#__PURE__*/_jsx("h3", {
        className: "text-lg font-bold text-white truncate text-center",
        children: title
      })
    })]
  });
};

// ------------------------------------------------------------- SubmitButton
// Submit-knop met laadstatus (label-swap + disabled), zoals elke
// formulieren-app 'm los implementeert. Styling per app via className.
export const SubmitButton = ({
  loading,
  label,
  loadingLabel,
  className = '',
  ...rest
}) => /*#__PURE__*/_jsx("button", {
  type: "submit",
  disabled: loading,
  className: className,
  ...rest,
  children: loading ? loadingLabel : label
});

// ---------------------------------------------------------------- FormField
// Label + input/textarea met de twee huisstijl-varianten:
// variant="light" (witte kaart, stamgast/vrijwilliger) of
// variant="dark" (glas-op-groen, veiligheid).
const FIELD_STYLES = {
  light: 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#20747F] focus:border-transparent outline-none transition',
  dark: 'w-full px-4 py-2 bg-white/10 border border-white/30 rounded-lg text-white placeholder-gray-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition'
};
const LABEL_STYLES = {
  light: 'block text-sm font-medium text-gray-700 mb-1',
  dark: 'block text-sm font-medium text-gray-200 mb-1'
};
export const FormField = ({
  label,
  name,
  variant = 'light',
  textarea = false,
  rows = 4,
  ...rest
}) => /*#__PURE__*/_jsxs("div", {
  children: [label && /*#__PURE__*/_jsx("label", {
    htmlFor: name,
    className: LABEL_STYLES[variant],
    children: label
  }), textarea ? /*#__PURE__*/_jsx("textarea", {
    id: name,
    name: name,
    rows: rows,
    className: FIELD_STYLES[variant],
    ...rest
  }) : /*#__PURE__*/_jsx("input", {
    id: name,
    name: name,
    className: FIELD_STYLES[variant],
    ...rest
  })]
});

// -------------------------------------------------------------- useSubmitForm
// De formulieren-state-machine (formData + handleChange + status) die
// veiligheid/stamgast/vrijwilliger elk apart implementeren.
// submitFn krijgt formData en mag throwen bij een fout.
export const useSubmitForm = (initial, submitFn) => {
  const [formData, setFormData] = useState(initial);
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error

  const handleChange = e => {
    const {
      name,
      value,
      type,
      checked
    } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  const handleSubmit = async e => {
    if (e && e.preventDefault) e.preventDefault();
    setStatus('submitting');
    try {
      await submitFn(formData);
      setStatus('success');
    } catch (err) {
      console.error('Formulier versturen mislukt:', err);
      setStatus('error');
    }
  };
  const reset = () => {
    setFormData(initial);
    setStatus('idle');
  };
  return {
    formData,
    setFormData,
    handleChange,
    handleSubmit,
    status,
    setStatus,
    reset
  };
};