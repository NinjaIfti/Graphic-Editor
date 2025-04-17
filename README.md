Here’s a clearer and more structured version of your code rules, keeping simplicity in mind:

---

## Code Rules

### **Getting Started**

1. Run `npm install` to install all required dependencies.
2. Start the development server with `npm run dev`.

This project already includes:

- **Tailwind CSS** for styling.
- **Alpine.js** for interactive elements.
- **Fabric.js** for canvas-based editing.

If you need other libraries, install them using **NPM** (`npm install <package-name>`).

---

### **Styling Rules**

- Use **Tailwind CSS** for all styling.
- If something does not work with Tailwind, you can use **vanilla CSS** as a fallback.

---

### **JavaScript Rules**

- Use **Alpine.js** for interactive elements.
- **Do NOT** use **jQuery** or any jQuery UI plugins.

---

### **File Organization**

- **Do not add** `<link>` or `<script>` tags for stylesheets and libraries in `index.html`.
- Instead, import styles in **`app.css`** and scripts in **`app.js`**.
- The `index.html` file is already linked to `app.css` and `app.js`.

---

### **Library Management**

- **Do NOT** manually download and include libraries in the code.
- **ALWAYS** install third-party libraries using **NPM** (`npm install <package-name>`).

---

This keeps the project clean, organized, and easy to manage.
