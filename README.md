# Triangulation Graph Editor — README

This project provides an interactive **Triangulation Graph Editor** built using HTML5 Canvas and plain JavaScript. It allows adding/removing vertices, creating edges, validating triangulations, selecting edges, and performing **parallel-safe edge flips** under strict geometric independence rules. The editor is designed for experimentation with triangulations and flip operations, useful for computational geometry research or educational demonstrations.

---

## 🚀 Features

### **1. Vertex & Edge Manipulation**

* Add vertices by clicking in **Add Vertex** mode.
* Add edges by selecting two vertices in **Add Edge** mode.
* Delete vertices or edges in **Delete** mode.
* Automatic adjacency structure using a bidirectional map.

### **2. Triangulation Validation**

* The **Validate** button checks whether every edge participates in **at least one triangle**, following the user's custom triangulation definition.

### **3. Edge Selection & Parallel Flip System**

* Click edges in **Select** mode to select flippable edges.
* Supports **single-select** and **multi-select with Shift**, following rules:

  * Two selected edges cannot lie in the same triangle.
  * New edges produced by flips cannot duplicate or form forbidden configurations.
  * Flips respect conflict avoidance for parallel operations.

### **4. Edge Flipping Rules**

An edge is flippable if:

* It is shared by **exactly two** triangles.
* Its opposite vertices are **not already adjacent**.

This editor performs bulk flips atomically, removing original edges and adding new diagonals.

### **5. Visualization**

* Clean rendering of vertices, edges, and optional triangle shading.
* Hit-testing for vertex and edge selection.
* Dynamic canvas scaling using device pixel ratio.

---

## 🧠 Important Concepts

### Triangles

A triangle is detected when **three vertices are mutually adjacent**.

### Independent Edge Sets for Parallel Flips

Two edges can be flipped together only if:

* They do **not** appear in the same triangle.
* Their resulting new edges do not collide.
* No new edge already exists (unless it's part of the removal set).

---

## 🖱️ Mouse / Keyboard Controls

### Modes

| Mode           | Action                                              |
| -------------- | --------------------------------------------------- |
| **Select**     | Click edges to select; Shift-click for multi-select |
| **Add Vertex** | Click anywhere to create a vertex                   |
| **Add Edge**   | Click two vertices to create an edge                |
| **Delete**     | Click vertex/edge to remove                         |

### Keyboard Shortcuts

* **F** → Flip selected edges
* **Delete/Backspace** → Remove selected edges

---

## 🛠️ Code Structure

### Main Components

* **Data Structures:** vertex list, adjacency map, edge-selection set.
* **Geometry Helpers:** segment distance, triangle detection, flippability rules.
* **Rendering Engine:** draws vertices, edges, triangle fills.
* **Interaction Logic:** pointer handlers, selection rules, multi-selection constraints.

### Key Functions

* `addVertex(x,y)` — inserts vertex
* `addEdge(u,v)` — inserts edge
* `removeVertex(id)` — deletes vertex
* `isFlippable(u,v)` — checks flip validity
* `flipSelectedEdges()` — performs safe parallel flips
* `isValidTriangulation()` — checks triangulation correctness

---

## 📦 Included Demo

A sample hexagon triangulation can be generated using:

```js
seedSample();
```

(Currently commented out.)

---

## 🧩 Integration

Use this script as **script.js** in your project. Ensure the HTML contains:

* A `<canvas id="c">`
* Mode buttons (`mode-select`, `mode-addv`, etc.)
* Action buttons (`validate`, `flip`, `clear`)
* A status element (`status`)

---

## 📄 License

This project is free to use and modify for academic or personal purposes.
