# Vibe Coding Party Gallery 🌊🌳

Welcome to the **Vibe Coding Party Gallery**! This repository hosts the static website for our monthly vibe coding events, showcasing creative projects built purely through iteration, plain language, and AI assistants.

## 🚀 View the Gallery
👉 **[Check out the live gallery here!](https://KTorres23.github.io/vibe-coding-party-gallery)**

## 🎨 What is Vibe Coding?
Vibe coding is a development philosophy where the programmer steps into the role of a creative director. Using state-of-the-art AI code generators, you dictate layout ideas, desired mechanics, and design languages, guiding the model through iterative prompting rather than manual keyboard typing.

## 📂 Submitting a Project
Submitting a project is completely automated and requires no manual git commands!

1. Visit the live gallery website.
2. Click the **Share Project** button.
3. Fill out the details (Title, Description, URLs).
4. Click **Submit**. A GitHub Issue will automatically open.
5. **Drag and drop** your project `.zip` file and a screenshot into the issue body.
6. Click **Submit new issue**.

A background script will automatically download your files, organize them, and create a Pull Request to get your project added to the gallery.

## 💻 Development
This is a pure static website (HTML, CSS, JS) designed to be hosted on GitHub Pages.

To run it locally:
```bash
# Start a local web server to enable fetching of YAML/JSON data files
python -m http.server 8000
```
Then navigate to `http://localhost:8000`.

### Data Management
- `parties.yaml`: Add new monthly parties here.
- `projects.json`: All submitted projects are stored here. (This is updated automatically by GitHub Actions).

---

## ✨ Disclaimer & Contact
**This entire website—from its layout and style to its underlying logic and automated GitHub workflows—was built entirely using vibe coding!** 

Created by Karina Torres. If you have questions about vibe coding, want to collaborate, or need help with the gallery, find my contact information on my **[personal website](https://ktorres23.github.io)**!