# Server Admin Academy

Server Admin Academy is a browser-based instructional platform for hands-on IT learning. It is designed around realistic technical work rather than isolated quiz questions, with learning activities organized by **technical domain** and **engagement mode**.

The project currently combines scenario-driven labs, knowledge assessments, guided practice, incident scenarios, capstone-style activities, documentation tools, and an interactive PC hardware simulator.

## Project Goals

The Academy is intended to help students practice the same kinds of decisions, workflows, troubleshooting steps, documentation, and validation they would encounter in real IT environments.

Core design goals include:

- Scenario-based and project-based learning
- Technical decision making instead of simple answer recall
- Hands-on configuration and troubleshooting workflows
- Clear separation between compatibility, business requirements, and successful technical operation
- Student-facing evidence and completion reporting
- Accessible keyboard-friendly interactions
- Reusable, data-driven activity definitions
- A consistent visual and navigation system across the entire Academy

## Main Learning Structure

### Technical Domains

The Academy currently organizes content into three broad domains:

- **Support Operations** — endpoint support, PC hardware, troubleshooting, maintenance, and technician workflows
- **Systems Engineering** — server administration, infrastructure configuration, directory services, networking services, and systems implementation
- **Security Operations** — hardening, security configuration, validation, assessment, and incident-oriented work

### Engagement Modes

Activities can also be accessed by the way students engage with the material:

- **Knowledge Assessments** — structured checks of technical understanding
- **Incident Scenarios** — troubleshooting and decision-making activities built around operational problems
- **Guided Practice** — scaffolded activities for learning workflows and procedures
- **Simulations** — interactive environments that model technical systems or equipment
- **Capstone Projects** — larger integrated activities requiring planning, implementation, validation, and documentation

## Functional Components

### 1. Academy Home and Navigation

`index.html` is the main entry point. It provides access to the Academy by both domain and engagement mode.

The project uses a shared navigation and visual system so users can move consistently between the Academy, simulations, tools, domain pages, and activity types.

### 2. Activity Runner

`activity.html` provides the browser-based activity/lab runner for scenario-driven technical tasks.

The activity engine is designed to support structured workflows such as:

- reading a scenario or ticket
- performing required technical actions
- progressing through multiple steps
- validating work
- recording completion state

Activity behavior is primarily controlled through JavaScript and JSON data rather than hard-coded page content.

### 3. Knowledge Assessment Engine

`assessment.html` and `assets/app-assessment.js` provide the assessment experience.

The assessment system supports data-driven technical questions and is intended to complement practical work rather than replace it.

### 4. Capstone / Project Engine

`project.html` and `assets/app-project.js` support larger project-style activities.

These activities are designed around multi-stage implementation rather than isolated tasks and can include planning, configuration, validation, and reflection/reporting.

### 5. PC Hardware Simulator

`simulator.html` is the interactive PC assembly simulator.

The simulator uses HTML, CSS, JavaScript, and JSON. It does **not** rely on static motherboard images. The motherboard, slots, connectors, installed components, controls, and validation states are interactive interface elements.

Current simulator version: **v2.7.1**

#### Current PC Build Scenarios

The simulator currently contains four activities:

1. **Instructor Demonstration: Guided PC Build**
   - simplified component catalog
   - intended for live classroom demonstration
   - demonstrates the full technician workflow before students begin assessed builds

2. **Finance Department Workstation Replacement**
   - business workstation scenario
   - focuses on compatibility, budget, storage, memory, display support, assembly, and POST

3. **Architectural Design Workstation**
   - high-performance workstation scenario
   - includes Intel and AMD platform choices
   - requires higher CPU performance, dual-channel memory, NVMe storage, dedicated graphics, VRAM, cooling, and workload suitability

4. **1440p Gaming PC Build**
   - gaming-focused system design scenario
   - requires balanced CPU/GPU choices
   - includes Intel and AMD CPUs plus NVIDIA and Radeon dedicated GPUs
   - validates dual-channel memory, GPU capability, cooling, power, storage, budget, and POST

#### Simulator Component Model

The simulator supports multiple component categories:

- Motherboards
- CPUs
- Thermal compound
- CPU coolers
- RAM
- NVMe storage
- Dedicated GPUs
- Power supplies
- Case fans

Motherboards and CPUs use real platform concepts such as:

- Intel LGA1700
- AMD AM5
- DDR4 / DDR5 support
- integrated Intel graphics
- integrated AMD Radeon graphics
- dedicated NVIDIA and Radeon graphics
- CPU core/thread counts
- workload performance tiers
- GPU VRAM and performance tiers
- PSU wattage and GPU power requirements
- cooler socket and cooling capability

#### Validation Layers

The simulator intentionally separates several different questions:

**Physical / platform compatibility**

Examples:

- CPU socket matches motherboard socket
- RAM generation matches the motherboard
- cooler supports the selected CPU platform
- required GPU power connectors are available

**Business / workload requirements**

Examples:

- minimum memory capacity
- dual-channel memory
- CPU core/thread or performance requirements
- dedicated GPU requirement
- minimum VRAM
- NVMe storage requirement
- display output requirement
- cooling requirement
- budget limit

**Assembly and power**

Examples:

- motherboard power connected
- CPU EPS power connected
- thermal compound installed
- CPU cooler installed
- CPU fan connected
- GPU power connected when required
- PSU capacity is sufficient

**POST**

A PC can be compatible but still fail the customer requirement, or meet many business requirements while failing to POST because of an assembly or power issue. This distinction is intentional and is central to the simulator's instructional design.

#### Dual-Channel Memory

The simulator includes four DIMM locations:

- A1
- A2
- B1
- B2

Scenarios can require dual-channel memory independently from total capacity. For example, a single 32 GB DIMM can satisfy a 32 GB capacity requirement while still failing the dual-channel requirement.

#### Component Research

Selected components provide a **Research specifications** link so students can investigate specifications and make informed choices rather than relying only on the simulator interface.

#### Attempts and Completion Reports

The simulator includes:

- Technician name
- Activity date
- Attempt counter
- Current build cost
- Installed component count
- Power state
- POST state
- Requirement progress
- Diagnostics
- Explicit validation
- Completion report generation

Completion reports are designed so students can print or save the final result as a PDF for submission.

### 6. Documentation Tools

The `tools/` section provides browser-based documentation generators that support professional IT workflows.

Current tools include:

- **Change Management** — generates structured change request documentation
- **Policy / Procedure Generator** — builds consistent policy or procedure documents
- **Configuration Report** — creates structured technical configuration reports

Tool processing happens locally in the browser. The tools share the same navigation, typography, color system, panels, focus treatment, and interaction language as the rest of the Academy.

## Accessibility

Accessibility is treated as a functional requirement rather than a later visual adjustment.

Current accessibility considerations include:

- semantic buttons and form controls
- keyboard-accessible interactive components
- visible focus states
- text labels in addition to color or visual cues
- readable contrast on the dark interface
- accessible labels for simulator regions and component targets
- explicit removal actions to reduce accidental destructive interactions
- responsive layouts for smaller screens

Future simulator and activity development should continue to preserve these principles.

## Data-Driven Design

A significant portion of the Academy is controlled through JSON configuration rather than duplicated HTML.

Important data files include:

- `data/activities.json` — activity catalog and activity metadata
- `data/simulations.json` — PC simulator scenarios, requirements, and component catalogs
- additional activity/project data under `data/`

The simulator scenario model allows new builds to be created primarily by defining:

- scenario story
- customer requirements
- available components
- component specifications
- compatibility properties
- workload thresholds
- budget

This makes it possible to expand the simulator without rebuilding the interface for every new scenario.

## Project Structure

```text
Server-Admin-Academy/
├── index.html                       # Academy home
├── activity.html                    # Scenario/lab runner
├── assessment.html                  # Knowledge assessment runner
├── project.html                     # Project/capstone runner
├── simulator.html                   # PC hardware simulator
├── simulations.html                 # Simulation catalog
├── knowledge-assessments.html       # Assessment catalog
├── incident-scenarios.html          # Incident scenario catalog
├── guided-practice.html             # Guided practice catalog
├── capstone-projects.html            # Capstone catalog
├── support-operations.html          # Support Operations domain
├── systems-engineering.html         # Systems Engineering domain
├── security-operations.html         # Security Operations domain
├── tools/
│   ├── index.html                   # Tools catalog
│   ├── change-management.html
│   ├── policy-procedure.html
│   └── config-report.html
├── assets/
│   ├── site.css                     # Shared Academy design system
│   ├── app.js                       # Shared navigation/site behavior
│   ├── app-activity.js              # Activity engine
│   ├── app-assessment.js            # Assessment engine
│   ├── app-project.js               # Project engine
│   ├── app-simulator.js             # Simulator loader/entry point
│   ├── app-simulator-v2.7.js        # Current simulator engine
│   ├── styles-simulator.css          # Simulator UI styling
│   ├── motherboard-v2.6.css          # Interactive motherboard layout
│   ├── motherboard-v2.6.1-polish.css
│   ├── motherboard-v2.6.2-polish.css
│   ├── simulator-select-polish.css
│   ├── tools.css                    # Documentation tools styling
│   └── app-tools.js                 # Documentation tool behavior
└── data/
    ├── activities.json
    ├── simulations.json
    └── ...
```

## Running the Project Locally

Because the application loads JSON with `fetch()`, it should be served through a local web server rather than opened directly from the filesystem.

### VS Code

Use the **Live Server** extension and open `index.html`.

### Python

From the repository root:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000/index.html
```

Example simulator URLs:

```text
http://localhost:8000/simulator.html?id=pc-demo
http://localhost:8000/simulator.html?id=pc-hardware
http://localhost:8000/simulator.html?id=pc-architect
http://localhost:8000/simulator.html?id=pc-gaming
```

## Development Workflow

The project uses a branch-based workflow so production remains stable while new features are tested.

Typical workflow:

```text
main
  ↓
development branch
  ↓
test and refine
  ↓
pull request
  ↓
merge into main
```

The current scenario-development branch is:

```text
pc-simulator-scenarios
```

Major simulator changes should be tested there before being merged into `main`.

## Current Development Direction

The Academy is evolving from a collection of individual activities into a reusable instructional platform. Current development priorities include:

- expanding PC hardware simulation scenarios
- adding additional hardware-focused simulations
- strengthening component research and decision-making
- expanding scenario and project libraries
- preserving accessibility across new features
- improving evidence and reporting workflows
- maintaining a consistent Academy-wide design system

## Technology

The project is intentionally lightweight and currently uses:

- HTML5
- CSS3
- JavaScript
- JSON
- Browser local state where appropriate
- GitHub for source control and deployment workflow

No heavyweight front-end framework is required for the current platform.

## Status

The Academy is an active instructional project and continues to evolve as new simulations, scenarios, assessments, tools, and project experiences are added.
