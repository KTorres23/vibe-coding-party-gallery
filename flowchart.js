/**
 * flowchart.js - Decision Tree & Interactive Navigator logic for Vibe Coding
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - Theme & Header
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeIcon = themeToggleBtn ? themeToggleBtn.querySelector('.theme-icon') : null;
    const themeLabel = themeToggleBtn ? themeToggleBtn.querySelector('.theme-label') : null;

    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const headerMenu = document.getElementById('headerMenu');

    // DOM Elements - Mode Switcher
    const btnWizardMode = document.getElementById('btnWizardMode');
    const btnVisualMode = document.getElementById('btnVisualMode');
    const wizardView = document.getElementById('wizardView');
    const visualView = document.getElementById('visualView');

    // DOM Elements - Wizard Controls
    const wizardQuestionContainer = document.getElementById('wizardQuestionContainer');
    const wizardResultContainer = document.getElementById('wizardResultContainer');
    const wizardStepTracker = document.getElementById('wizardStepTracker');
    const progressBar = document.getElementById('progressBar');
    const btnWizardBack = document.getElementById('btnWizardBack');
    const btnWizardReset = document.getElementById('btnWizardReset');

    // DOM Elements - Visual Map
    const treeGrid = document.getElementById('treeGrid');
    const nodeDetailDrawer = document.getElementById('nodeDetailDrawer');
    const nodeDetailContent = document.getElementById('nodeDetailContent');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    // State
    let wizardState = {
        currentStep: 1,
        goal: null,
        subOption: null,
        history: []
    };

    // ==================== THEME LOGIC ====================
    function setThemeButtonLabel(isDark) {
        if (themeIcon && themeLabel) {
            themeIcon.textContent = isDark ? '☀️' : '🌙';
            themeLabel.textContent = isDark ? ' Light Mode' : ' Night Mode';
        }
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('vibe_theme');
        const isDark = savedTheme === 'dark';
        document.body.classList.toggle('dark-mode', isDark);
        setThemeButtonLabel(isDark);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('vibe_theme', isDark ? 'dark' : 'light');
            setThemeButtonLabel(isDark);
        });
    }

    initTheme();

    // ==================== MOBILE MENU ====================
    if (hamburgerBtn && headerMenu) {
        hamburgerBtn.addEventListener('click', () => {
            const isOpen = headerMenu.classList.toggle('open');
            hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
            hamburgerBtn.textContent = isOpen ? '✕' : '☰';
        });
    }

    // ==================== MODE SWITCHING ====================
    btnWizardMode.addEventListener('click', () => {
        btnWizardMode.classList.add('active');
        btnVisualMode.classList.remove('active');
        wizardView.classList.remove('hidden');
        visualView.classList.add('hidden');
    });

    btnVisualMode.addEventListener('click', () => {
        btnVisualMode.classList.add('active');
        btnWizardMode.classList.remove('active');
        visualView.classList.remove('hidden');
        wizardView.classList.add('hidden');
        renderVisualTree();
    });

    // ==================== FLOWCHART DATA DATASET ====================
    const QUESTIONS = {
        step1: {
            title: "What do you want to achieve with vibe coding?",
            subtitle: "Select the option that best describes your primary goal or workflow.",
            options: [
                {
                    id: 'chat',
                    icon: '💬',
                    title: 'Chat & Brainstorming',
                    description: 'Ask questions, summarize scientific papers, draft ideas, or generate quick text.'
                },
                {
                    id: 'data',
                    icon: '📊',
                    title: 'Data Analysis & Statistics',
                    description: 'Work with ecological data, RStudio scripts, Python, or spatial rasters.'
                },
                {
                    id: 'web',
                    icon: '🌐',
                    title: 'Build Web Apps & Visualizers',
                    description: 'Create interactive biodiversity dashboards, iNaturalist visualizers, or portfolio sites.'
                },
                {
                    id: 'learn',
                    icon: '🎓',
                    title: 'Learn to Code or Student Perks',
                    description: 'Get started from scratch or claim free academic developer tools (.edu).'
                },
                {
                    id: 'code',
                    icon: '💻',
                    title: 'Write Professional Software',
                    description: 'Build full-stack software, tools, and AI extensions with advanced assistance.'
                }
            ]
        },

        step2: {
            chat: {
                title: "How do you prefer to access your AI chat assistant?",
                subtitle: "Choose your privacy and cost preference.",
                options: [
                    {
                        id: 'chat_free_local',
                        icon: '🔒',
                        title: 'Free & 100% Local (Offline)',
                        description: 'Run open LLMs (Llama 3, Qwen) directly on your laptop with full data privacy.'
                    },
                    {
                        id: 'chat_free_cloud',
                        icon: '☁️',
                        title: 'Free Cloud Tiers',
                        description: 'Use top-tier web models (ChatGPT, Claude, Gemini free tiers) in your browser.'
                    },
                    {
                        id: 'chat_paid',
                        icon: '⭐',
                        title: 'Paid Pro Subscriptions',
                        description: 'Access the smartest models (Claude 3.7 Sonnet, ChatGPT Pro) via monthly subscription.'
                    }
                ]
            },

            data: {
                title: "Which environment and budget fits your data workflow?",
                subtitle: "Tailored options for R users in ecology and Python data analysts.",
                options: [
                    {
                        id: 'data_rstudio_local',
                        icon: '🌿',
                        title: 'RStudio + Free Local AI (chattr)',
                        description: 'Use the R `chattr` package inside RStudio connected to a local Ollama model.'
                    },
                    {
                        id: 'data_rstudio_cloud',
                        icon: '🚀',
                        title: 'RStudio + Cloud API (ellmer / chattr)',
                        description: 'Connect RStudio directly to OpenAI/Claude APIs using `ellmer` or `chattr`.'
                    },
                    {
                        id: 'data_vscode',
                        icon: '⚡',
                        title: 'VS Code or Positron IDE',
                        description: 'Use Positron or VS Code with Continue + Ollama for Python/R data science.'
                    }
                ]
            },

            web: {
                title: "What is your web development experience level?",
                subtitle: "Choose between instant no-code website generators or custom code tools.",
                options: [
                    {
                        id: 'web_nocode',
                        icon: '⚡',
                        title: 'No-Code / Instant Speed',
                        description: 'Describe your website in plain English and let AI generate complete hosted web apps.'
                    },
                    {
                        id: 'web_custom',
                        icon: '🛠️',
                        title: 'Custom Code + Full Control',
                        description: 'Write HTML/JS/CSS with AI code assistants and host for free on GitHub Pages.'
                    }
                ]
            },

            learn: {
                title: "Are you a student or researcher with a .edu email?",
                subtitle: "Check if you qualify for free academic pro tiers.",
                options: [
                    {
                        id: 'learn_student',
                        icon: '🎓',
                        title: 'Yes, I have a .edu email',
                        description: 'Claim the GitHub Student Developer Pack for 100% free GitHub Copilot access.'
                    },
                    {
                        id: 'learn_general',
                        icon: '🧪',
                        title: 'No, I want a free sandbox',
                        description: 'Set up an unlimited, zero-cost local sandbox with Ollama and VS Code or RStudio.'
                    }
                ]
            },

            code: {
                title: "What is your preferred balance of cost vs cutting-edge power?",
                subtitle: "For dedicated developers and power vibe coders.",
                options: [
                    {
                        id: 'code_free',
                        icon: '🔒',
                        title: 'Free & Open Source Stack',
                        description: 'VS Code + Continue extension + local Ollama / DeepSeek models.'
                    },
                    {
                        id: 'code_pro',
                        icon: '🔥',
                        title: 'Pro AI Coding Environment',
                        description: 'Cursor Pro or Claude Code CLI for autonomous, full-repository code editing.'
                    }
                ]
            }
        }
    };

    const RECOMMENDATIONS = {
        chat_free_local: {
            title: 'Ollama Desktop App',
            tier: 'Tier 1 - Local',
            costBadge: '🆓 100% Free',
            privacyBadge: '🔒 100% Private & Offline',
            ecoBadge: '🌱 Eco-Friendly (0 Data Center Emissions)',
            ecoNote: 'Running open models locally on your hardware eliminates server energy consumption and data center carbon footprint!',
            target: 'Ecologists with sensitive field data, offline researchers, zero-budget privacy advocates.',
            description: 'Ollama lets you run state-of-the-art open models (Llama 3.2, Qwen 2.5, DeepSeek R1) locally on your Mac, Windows, or Linux machine with no internet connection required.',
            steps: [
                'Download & install Ollama from <a href="https://ollama.com/" target="_blank">ollama.com</a>.',
                'Open your terminal or command prompt and run `ollama run llama3.2` or `ollama run qwen2.5`.',
                'Or use a clean visual GUI like Page Assist or Chatbox connected to Ollama.'
            ],
            prompt: 'Act as an expert field ecologist. Help me design a sampling protocol for monitoring [your topic/species, e.g., pollinator diversity in urban gardens] under different canopy coverage levels.',
            link: 'https://ollama.com/',
            resources: [
                { title: 'Ollama Desktop (Local Models)', author: 'Ollama Team', link: 'https://ollama.com', desc: 'Run Llama 3.2 & DeepSeek R1 locally offline.' },
                { title: 'Caveman Prompt Simplifier 🗿', author: 'Caveman Team', link: 'https://caveman.so/', desc: 'Slash token consumption and reduce environmental footprint.' },
                { title: 'Freeflow (Voice Dictation)', author: 'Zach Latta', link: 'https://github.com/zachlatta/freeflow', desc: 'Open-source voice-to-text dictation for rapid prompt drafting.' }
            ]
        },

        chat_free_cloud: {
            title: 'ChatGPT / Claude / Gemini (Free Cloud Tiers)',
            tier: 'Tier 1b - Cloud Free',
            costBadge: '🆓 Free Cloud',
            privacyBadge: '☁️ Standard Cloud Privacy',
            target: 'Casual chat, paper summarization, quick code snippet generation in the browser.',
            description: 'Free browser-based AI models from OpenAI, Anthropic, and Google provide instant access to high-reasoning models with zero setup required.',
            steps: [
                'Create free accounts at <a href="https://chatgpt.com" target="_blank">ChatGPT</a>, <a href="https://claude.ai" target="_blank">Claude.ai</a>, or <a href="https://gemini.google.com" target="_blank">Gemini</a>.',
                'Upload PDF research papers directly into Claude or ChatGPT to extract key methodology notes.',
                'Use web search features in Gemini/ChatGPT for real-time literature updates.'
            ],
            prompt: 'Here is an abstract regarding [your research topic, e.g., sea turtle migration patterns]. Please summarize the key management recommendations into 3 bullet points for field technicians.',
            link: 'https://claude.ai',
            resources: [
                { title: 'Creating ChatGPT Sites', author: 'OpenAI', link: 'https://help.openai.com/en/articles/20001339-creating-and-managing-chatgpt-sites', desc: 'Official guide on building and deploying instant hosted web apps directly using ChatGPT.' },
                { title: 'Claude Superpowers', author: 'Obra', link: 'https://github.com/obra/superpowers', desc: 'System prompts and workflows unlocking advanced agentic coding skills.' },
                { title: 'Google Gemini', author: 'Google', link: 'https://gemini.google.com', desc: 'Multimodal AI assistant with large context windows for papers & data.' }
            ]
        },

        chat_paid: {
            title: 'Claude Pro / ChatGPT Plus / Gemini Advanced',
            tier: 'Tier 1c - Pro Cloud',
            costBadge: '💳 ~$20 / month',
            privacyBadge: '☁️ Enhanced Cloud Features',
            target: 'Researchers requiring high reasoning, large context windows, and advanced data analysis.',
            description: 'Paid cloud subscriptions unlock reasoning models (Claude 3.7 Sonnet, OpenAI o3-mini) capable of analyzing massive datasets, reading long manuscripts, and drafting complex code.',
            steps: [
                'Subscribe to Claude Pro or ChatGPT Plus for access to flagship models.',
                'Use Claude Artifacts to generate interactive charts and web widgets live in chat.',
                'Use Advanced Data Analysis in ChatGPT to run instant Python analyses on uploaded CSVs.'
            ],
            prompt: 'I uploaded a CSV of occurrence data for [your species, e.g., Monarch Butterflies]. Generate an exploratory summary including species richness, abundance per site, and flag any missing values.',
            link: 'https://claude.ai',
            resources: [
                { title: 'Claude & Anthropic Artifacts', author: 'Anthropic', link: 'https://claude.ai', desc: 'LLM interface with real-time web artifact rendering for interactive visualizers.' },
                { title: 'Compound Engineering Plugin', author: 'Every Inc', link: 'https://github.com/everyinc/compound-engineering-plugin', desc: 'Framework for agent structuring, brain dumping, and vibe coding projects.' },
                { title: 'DeepSeek AI', author: 'DeepSeek', link: 'https://www.deepseek.com', desc: 'Open-weights reasoning (R1) and coding models.' }
            ]
        },

        data_rstudio_local: {
            title: 'RStudio + chattr Package + Ollama Local',
            tier: 'Tier 2 - Ecology RStudio Local',
            costBadge: '🆓 100% Free',
            privacyBadge: '🔒 Offline Field Ready',
            ecoBadge: '🌱 Eco-Friendly Field Setup',
            ecoNote: '100% offline local RStudio inference eliminates cloud server emissions while preserving sensitive field data privacy.',
            target: 'R-using ecologists who want AI code generation inside RStudio without internet.',
            description: 'The `chattr` R package seamlessly integrates an AI chat pane directly inside RStudio. Connected to Ollama, it lets you vibe-code ggplot2 figures and dplyr wrangling offline.',
            steps: [
                'Install Ollama from <a href="https://ollama.com" target="_blank">ollama.com</a> and run `ollama run llama3.2`.',
                'In RStudio, install `chattr`: `install.packages("chattr")`.',
                'Run `library(chattr)` and start the RStudio GUI gadget with `chattr::chattr_gui()`.'
            ],
            prompt: '# In RStudio chattr pane:\nWrite a tidyverse script to load [your dataset, e.g., forest_biodiversity.csv], filter for year >= 2020, calculate Shannon diversity index per site using the vegan package, and plot a boxplot with ggplot2.',
            link: 'https://mlverse.github.io/chattr/',
            resources: [
                { title: 'chattr for RStudio', author: 'mlverse / Posit', link: 'https://mlverse.github.io/chattr/', desc: 'Interactive AI chat pane connected to local or cloud models inside RStudio.' },
                { title: 'Positron IDE', author: 'Posit', link: 'https://positron.posit.co', desc: 'Next-gen data science IDE for R & Python ecologists.' },
                { title: 'iNaturalist API & Open Data', author: 'iNaturalist', link: 'https://api.inaturalist.org/v1/docs/', desc: 'Access millions of community biodiversity observations directly in R.' }
            ]
        },

        data_rstudio_cloud: {
            title: 'RStudio + ellmer / chattr + Cloud API',
            tier: 'Tier 2b - Ecology RStudio Cloud',
            costBadge: '⚡ Pay-as-you-go API (Pennies/day)',
            privacyBadge: '☁️ Cloud API',
            target: 'Ecologists wanting maximum R code quality inside RStudio using Claude or OpenAI APIs.',
            description: 'Using packages like `ellmer` (by Posit/RStudio team) or `chattr`, you can query state-of-the-art LLM APIs directly from your R console and scripts.',
            steps: [
                'Get an API key from Anthropic (Claude) or OpenAI.',
                'In RStudio, install `ellmer`: `install.packages("ellmer")`.',
                'Set your API key: `Sys.setenv(ANTHROPIC_API_KEY = "your-key")`.',
                'Call `chat <- ellmer::chat_claude()` and ask R questions directly!'
            ],
            prompt: 'library(ellmer)\nchat <- chat_claude()\nchat$chat("Write an R function using sf and terra to crop a raster dataset to [your area of interest, e.g., Yellowstone National Park boundary].")',
            link: 'https://ellmer.tidyverse.org/',
            resources: [
                { title: 'ellmer R Package', author: 'Tidyverse / Posit', link: 'https://ellmer.tidyverse.org/', desc: 'Official Tidyverse package for structured LLM API calls in R scripts.' },
                { title: 'GBIF API', author: 'GBIF', link: 'https://www.gbif.org/developer/summary', desc: 'Query species occurrence records and spatial data via R.' },
                { title: 'Movebank Database', author: 'Max Planck Institute', link: 'https://www.movebank.org/', desc: 'Free telemetry and animal movement dataset API for R.' }
            ]
        },

        data_vscode: {
            title: 'Positron IDE / VS Code + Continue Extension',
            tier: 'Tier 2c - Next-Gen Data IDE',
            costBadge: '🆓 Free & Open Source',
            privacyBadge: '🔒 Hybrid Local/Cloud',
            target: 'Data scientists & ecologists switching between R & Python in modern data science IDEs.',
            description: 'Positron (the new data science IDE from Posit) and VS Code with the `Continue.dev` extension give you inline code completion, side-by-side plots, and multi-language AI support.',
            steps: [
                'Download Positron IDE from <a href="https://positron.posit.co/" target="_blank">positron.posit.co</a> or VS Code.',
                'Install the free `Continue` extension from the extensions marketplace.',
                'Connect Continue to local Ollama or cloud APIs for inline code generation.'
            ],
            prompt: 'Write a Python script using pandas and geopandas to read an iNaturalist occurrence CSV for [your species, e.g., Kelp Forest Fauna], convert latitude/longitude into a GeoDataFrame, and export as a GeoJSON file.',
            link: 'https://positron.posit.co/',
            resources: [
                { title: 'Positron IDE', author: 'Posit', link: 'https://positron.posit.co', desc: 'Next-generation data science IDE for R and Python.' },
                { title: 'Continue.dev Extension', author: 'Continue Dev', link: 'https://continue.dev', desc: 'Open-source AI coding assistant extension for VS Code.' },
                { title: 'Firstmate', author: 'Kun Chen', link: 'https://github.com/kunchenguid/firstmate', desc: 'AI pair programmer assistant for repository exploration.' }
            ]
        },

        web_nocode: {
            title: 'Lovable.dev / Bolt.new / v0',
            tier: 'Tier 4b - Web App Builder',
            costBadge: '🆓 Free Trial / Paid Tiers',
            privacyBadge: '☁️ Cloud Hosted',
            target: 'Ecologists with zero web experience who want to build a functional web app in minutes.',
            description: 'Full-stack AI website builders allow you to describe a web app (e.g., "An interactive map of invasive plant species in California with filter sliders") and immediately preview/deploy it.',
            steps: [
                'Go to <a href="https://lovable.dev" target="_blank">Lovable.dev</a> or <a href="https://bolt.new" target="_blank">Bolt.new</a>.',
                'Prompt: "Build a single-page ecological dashboard with a Leaflet map, species filter buttons, and clean glassmorphism styling."',
                'Click Deploy to get a live URL to share with colleagues!'
            ],
            prompt: 'Build a dark-themed web application for citizen scientists to record [your observation type, e.g., Coral Reef Bleaching sightings]. Include a form for location, date, photo upload, and an interactive Leaflet map.',
            link: 'https://lovable.dev',
            resources: [
                { title: 'Creating ChatGPT Sites', author: 'OpenAI', link: 'https://help.openai.com/en/articles/20001339-creating-and-managing-chatgpt-sites', desc: 'Deploy hosted websites directly from ChatGPT prompts.' },
                { title: 'AI Hero Images Guide', author: 'Dan Morris', link: 'https://github.com/agentmorris/hero-images', desc: 'Prompts & visual guides for creating hero banners for web apps.' },
                { title: 'iNaturalist API', author: 'iNaturalist', link: 'https://api.inaturalist.org/v1/docs/', desc: 'Connect web apps to live species observation data.' }
            ]
        },

        web_custom: {
            title: 'VS Code / Cursor + GitHub Pages Bridge',
            tier: 'Tier 4a - Custom Web & Cloud Hosting',
            costBadge: '🆓 100% Free Hosting',
            privacyBadge: '🛠️ Full Source Code Ownership',
            target: 'Vibe coders who want complete ownership of their source code and free hosting on GitHub.',
            description: 'Use AI assistants (Cursor or VS Code) to write standard HTML/CSS/JS code, then publish it instantly for free via GitHub Pages — exactly how this Vibe Coding Hub is hosted!',
            steps: [
                'Create a GitHub repository for your project.',
                'Open the folder in VS Code or Cursor and vibe code your `index.html` and `style.css`.',
                'Go to Repository Settings -> Pages -> Deploy from Branch (`main`) to publish live!'
            ],
            prompt: 'Create a responsive web page with a modern dark theme that displays a gallery of camera trap photos for [your region, e.g., Amazonian Wildlife] with tags for species, location, and confidence score.',
            link: 'https://pages.github.com/',
            resources: [
                { title: "Dan Morris' Template", author: 'Dan Morris', link: 'https://lila.science/vibe-coding-parties', desc: 'Foundational repository template for hosting ecology web apps.' },
                { title: 'Cursor IDE', author: 'Anysphere', link: 'https://cursor.com', desc: 'AI-first code editor for full codebase web development.' },
                { title: 'WILDLABS Community', author: 'WILDLABS', link: 'https://wildlabs.net/', desc: 'Global conservation technology developer network.' }
            ]
        },

        learn_student: {
            title: 'GitHub Copilot Student Pack',
            tier: 'Tier 6b - Free Academic Cloud',
            costBadge: '🎓 100% Free for Students',
            privacyBadge: '☁️ Cloud Copilot',
            target: 'Students, university researchers, and educators with a verified .edu email.',
            description: 'GitHub provides free access to GitHub Copilot (normally $10/mo) for all verified students and teachers via the GitHub Global Campus program.',
            steps: [
                'Apply for the <a href="https://education.github.com/pack" target="_blank">GitHub Student Developer Pack</a> using your .edu email.',
                'Once approved, install the GitHub Copilot extension in VS Code, RStudio, or JetBrains.',
                'Enjoy real-time AI auto-complete as you type code in any programming language!'
            ],
            prompt: '// Write a Python function to calculate NDVI (Normalized Difference Vegetation Index) for [your satellite dataset, e.g., Sentinel-2 imagery]:\ndef calculate_ndvi(nir, red):',
            link: 'https://education.github.com/pack',
            resources: [
                { title: 'GitHub Copilot Student Developer Pack', author: 'GitHub', link: 'https://education.github.com/pack', desc: '100% free Copilot for students and researchers with .edu email.' },
                { title: 'Firstmate', author: 'Kun Chen', link: 'https://github.com/kunchenguid/firstmate', desc: 'AI pair programmer tool for understanding repository code.' },
                { title: 'Caveman Prompt Simplifier 🗿', author: 'Caveman Team', link: 'https://caveman.so/', desc: 'Reduce token costs and environmental energy usage.' }
            ]
        },

        learn_general: {
            title: 'Ollama + VS Code / RStudio Local Sandbox',
            tier: 'Tier 6 - Zero-Cost Sandbox',
            costBadge: '🆓 100% Free Forever',
            privacyBadge: '🔒 100% Offline & Private',
            ecoBadge: '🌱 Eco-Friendly Sandbox',
            ecoNote: 'Zero cloud API calls, reducing both costs and carbon emissions while you learn.',
            target: 'Beginners wanting a safe, zero-cost sandbox to experiment without subscription worries.',
            description: 'Combine local Ollama models with your favorite code editor for an unlimited, offline learning sandbox with no token limits or monthly bills.',
            steps: [
                'Install Ollama and download a lightweight coding model: `ollama run qwen2.5-coder`.',
                'Install VS Code or RStudio.',
                'Install the free `Continue` extension in VS Code and select Ollama as your provider.'
            ],
            prompt: 'Explain how raster geospatial data works in R for [your domain, e.g., land cover mapping] using simple analogies for someone with a biology background.',
            link: 'https://ollama.com/',
            resources: [
                { title: 'Ollama Desktop', author: 'Ollama Team', link: 'https://ollama.com', desc: 'Zero-cost local model runner for offline coding.' },
                { title: 'chattr for RStudio', author: 'mlverse', link: 'https://mlverse.github.io/chattr/', desc: 'RStudio gadget for offline local R code assistance.' },
                { title: 'Continue.dev Extension', author: 'Continue Dev', link: 'https://continue.dev', desc: 'Free open source AI extension for VS Code.' }
            ]
        },

        code_free: {
            title: 'VS Code + Continue Extension + Ollama',
            tier: 'Tier 3 - Open Source Stack',
            costBadge: '🆓 100% Free & Open Source',
            privacyBadge: '🔒 Fully Private',
            ecoBadge: '🌱 Open-Source Eco Stack',
            ecoNote: 'Pair local inference with Caveman prompt simplification to slash token overhead and carbon impact.',
            target: 'Software developers and bioinformaticians wanting open-source tools without API lock-in.',
            description: 'Continue is the leading open-source AI code assistant for VS Code and JetBrains. Connect it to local models (DeepSeek R1, Qwen Coder) or open APIs.',
            steps: [
                'Install VS Code from <a href="https://code.visualstudio.com" target="_blank">code.visualstudio.com</a>.',
                'Install the `Continue` extension from the VS Code Marketplace.',
                'Configure `config.json` in Continue to point to Ollama or your API endpoint of choice.'
            ],
            prompt: 'Refactor this R/Python processing script for [your project, e.g., acoustic bat monitoring], add roxygen2 documentation comments, and handle edge cases for NA values.',
            link: 'https://continue.dev',
            resources: [
                { title: 'Continue.dev Extension', author: 'Continue Dev', link: 'https://continue.dev', desc: 'Open-source VS Code AI coding assistant.' },
                { title: 'DeepSeek AI', author: 'DeepSeek', link: 'https://www.deepseek.com', desc: 'Open-weights reasoning and coding model provider.' },
                { title: 'Compound Engineering Plugin', author: 'Every Inc', link: 'https://github.com/everyinc/compound-engineering-plugin', desc: 'Agent structuring and project management plugin.' }
            ]
        },

        code_pro: {
            title: 'Cursor Pro / Claude Code CLI',
            tier: 'Tier 3b - Pro AI Code Engine',
            costBadge: '💳 ~$20 / month',
            privacyBadge: '☁️ Advanced Repo Indexing',
            target: 'Full-stack developers, researchers building complex packages, and power vibe coders.',
            description: 'Cursor (AI-first code editor) and Claude Code (terminal-based agent) can index your entire repository, edit multiple files autonomously, and execute tests automatically.',
            steps: [
                'Download <a href="https://cursor.com" target="_blank">Cursor IDE</a> or install Claude Code (`npm i -g @anthropic-ai/claude-code`).',
                'Use Cursor Composer (`Cmd+I` or `Ctrl+I`) to describe multi-file features in natural language.',
                'Let the AI edit files across your codebase while you review diffs live.'
            ],
            prompt: 'Refactor our entire data processing pipeline for [your project, e.g., camera trap image annotation] to use async API queries, add error logging, and write unit tests.',
            link: 'https://cursor.com',
            resources: [
                { title: 'Cursor IDE', author: 'Anysphere', link: 'https://cursor.com', desc: 'AI-first code editor with full repository indexing.' },
                { title: 'Claude Superpowers', author: 'Obra', link: 'https://github.com/obra/superpowers', desc: 'Advanced agentic coding capabilities for Claude.' },
                { title: 'Firstmate', author: 'Kun Chen', link: 'https://github.com/kunchenguid/firstmate', desc: 'AI repository exploration tool.' }
            ]
        }
    };

    // ==================== WIZARD LOGIC ====================
    function renderStep1() {
        wizardState.currentStep = 1;
        wizardStepTracker.textContent = 'Step 1 of 2';
        progressBar.style.width = '50%';
        btnWizardBack.classList.add('hidden');
        btnWizardReset.classList.add('hidden');

        wizardResultContainer.classList.add('hidden');
        wizardQuestionContainer.classList.remove('hidden');

        const stepData = QUESTIONS.step1;
        wizardQuestionContainer.innerHTML = `
            <div class="question-header">
                <h3>${stepData.title}</h3>
                <p>${stepData.subtitle}</p>
            </div>
            <div class="options-grid">
                ${stepData.options.map(opt => `
                    <button class="option-card glass-panel-sm" data-goal="${opt.id}">
                        <div class="option-icon">${opt.icon}</div>
                        <div class="option-details">
                            <h4>${opt.title}</h4>
                            <p>${opt.description}</p>
                        </div>
                        <div class="option-arrow">→</div>
                    </button>
                `).join('')}
            </div>
        `;

        // Attach event listeners
        wizardQuestionContainer.querySelectorAll('.option-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = btn.getAttribute('data-goal');
                wizardState.goal = goal;
                wizardState.history.push(1);
                renderStep2(goal);
            });
        });
    }

    function renderStep2(goal) {
        wizardState.currentStep = 2;
        wizardStepTracker.textContent = 'Step 2 of 2';
        progressBar.style.width = '85%';
        btnWizardBack.classList.remove('hidden');
        btnWizardReset.classList.remove('hidden');

        const stepData = QUESTIONS.step2[goal];
        if (!stepData) return;

        wizardQuestionContainer.innerHTML = `
            <div class="question-header">
                <h3>${stepData.title}</h3>
                <p>${stepData.subtitle}</p>
            </div>
            <div class="options-grid">
                ${stepData.options.map(opt => `
                    <button class="option-card glass-panel-sm" data-sub="${opt.id}">
                        <div class="option-icon">${opt.icon}</div>
                        <div class="option-details">
                            <h4>${opt.title}</h4>
                            <p>${opt.description}</p>
                        </div>
                        <div class="option-arrow">→</div>
                    </button>
                `).join('')}
            </div>
        `;

        wizardQuestionContainer.querySelectorAll('.option-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const subId = btn.getAttribute('data-sub');
                wizardState.subOption = subId;
                renderResult(subId);
            });
        });
    }

    function renderResult(resultKey) {
        wizardState.currentStep = 3;
        wizardStepTracker.textContent = 'Recommendation Ready!';
        progressBar.style.width = '100%';

        wizardQuestionContainer.classList.add('hidden');
        wizardResultContainer.classList.remove('hidden');

        const rec = RECOMMENDATIONS[resultKey];
        if (!rec) return;

        const rawPrompt = rec.prompt;

        wizardResultContainer.innerHTML = `
            <div class="rec-card">
                <div class="rec-badges-strip">
                    <span class="badge badge-tier">${rec.tier}</span>
                    <span class="badge badge-cost">${rec.costBadge}</span>
                    <span class="badge badge-privacy">${rec.privacyBadge}</span>
                    ${rec.ecoBadge ? `<span class="badge badge-eco">${rec.ecoBadge}</span>` : ''}
                </div>

                <h2>🌿 ${rec.title}</h2>
                <p class="rec-target"><strong>Ideal For:</strong> ${rec.target}</p>
                <p class="rec-description">${rec.description}</p>

                ${rec.ecoNote ? `
                <div class="rec-section eco-callout-box">
                    <span class="eco-callout-icon">🌱</span>
                    <div class="eco-callout-text">
                        <strong>Sustainability & Energy Impact:</strong> ${rec.ecoNote}
                    </div>
                </div>
                ` : ''}

                <div class="rec-section">
                    <h4>🚀 Quick Setup Steps</h4>
                    <ol class="rec-steps">
                        ${rec.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>

                <div class="rec-section">
                    <div class="prompt-header">
                        <h4>📋 Starter Prompt Template</h4>
                        <button id="btnCopyPrompt" class="btn-copy-sm">Copy Prompt</button>
                    </div>
                    <pre class="prompt-box"><code id="promptText">${rec.prompt}</code></pre>
                </div>

                ${rec.resources && rec.resources.length ? `
                <div class="rec-section rec-resources-block">
                    <h4>📚 Matching Community-Curated Resources</h4>
                    <div class="rec-resources-grid">
                        ${rec.resources.map(res => `
                            <div class="rec-resource-item">
                                <div class="res-item-title"><a href="${res.link}" target="_blank">${res.title} ↗</a></div>
                                <div class="res-item-author">By ${res.author}</div>
                                <div class="res-item-desc">${res.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 1rem; text-align: right;">
                        <a href="index.html#resources" class="btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">Explore Full Resources Directory →</a>
                    </div>
                </div>
                ` : ''}

                <div class="rec-actions">
                    <a href="${rec.link}" target="_blank" class="btn-primary">Get Started with ${rec.title} ↗</a>
                    <button id="btnRestartResult" class="btn-secondary">🔄 Start Over</button>
                </div>
            </div>
        `;

        // Copy prompt functionality
        const promptText = document.getElementById('promptText');
        const btnCopyPrompt = document.getElementById('btnCopyPrompt');
        if (btnCopyPrompt) {
            btnCopyPrompt.addEventListener('click', () => {
                const currentText = promptText.innerText;
                navigator.clipboard.writeText(currentText).then(() => {
                    btnCopyPrompt.textContent = '✓ Copied!';
                    setTimeout(() => {
                        btnCopyPrompt.textContent = 'Copy Prompt';
                    }, 2000);
                });
            });
        }

        const btnRestartResult = document.getElementById('btnRestartResult');
        if (btnRestartResult) {
            btnRestartResult.addEventListener('click', renderStep1);
        }
    }

    // ==================== WIZARD LOGIC ====================
    function renderStep1() {
        wizardState.currentStep = 1;
        wizardStepTracker.textContent = 'Step 1 of 2';
        progressBar.style.width = '50%';
        btnWizardBack.classList.add('hidden');
        btnWizardReset.classList.add('hidden');

        wizardResultContainer.classList.add('hidden');
        wizardQuestionContainer.classList.remove('hidden');

        const stepData = QUESTIONS.step1;
        wizardQuestionContainer.innerHTML = `
            <div class="question-header">
                <h3>${stepData.title}</h3>
                <p>${stepData.subtitle}</p>
            </div>
            <div class="options-grid">
                ${stepData.options.map(opt => `
                    <button class="option-card glass-panel-sm" data-goal="${opt.id}">
                        <div class="option-icon">${opt.icon}</div>
                        <div class="option-details">
                            <h4>${opt.title}</h4>
                            <p>${opt.description}</p>
                        </div>
                        <div class="option-arrow">→</div>
                    </button>
                `).join('')}
            </div>
        `;

        // Attach event listeners
        wizardQuestionContainer.querySelectorAll('.option-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const goal = btn.getAttribute('data-goal');
                wizardState.goal = goal;
                wizardState.history.push(1);
                renderStep2(goal);
            });
        });
    }

    function renderStep2(goal) {
        wizardState.currentStep = 2;
        wizardStepTracker.textContent = 'Step 2 of 2';
        progressBar.style.width = '85%';
        btnWizardBack.classList.remove('hidden');
        btnWizardReset.classList.remove('hidden');

        const stepData = QUESTIONS.step2[goal];
        if (!stepData) return;

        wizardQuestionContainer.innerHTML = `
            <div class="question-header">
                <h3>${stepData.title}</h3>
                <p>${stepData.subtitle}</p>
            </div>
            <div class="options-grid">
                ${stepData.options.map(opt => `
                    <button class="option-card glass-panel-sm" data-sub="${opt.id}">
                        <div class="option-icon">${opt.icon}</div>
                        <div class="option-details">
                            <h4>${opt.title}</h4>
                            <p>${opt.description}</p>
                        </div>
                        <div class="option-arrow">→</div>
                    </button>
                `).join('')}
            </div>
        `;

        wizardQuestionContainer.querySelectorAll('.option-card').forEach(btn => {
            btn.addEventListener('click', () => {
                const subId = btn.getAttribute('data-sub');
                wizardState.subOption = subId;
                renderResult(subId);
            });
        });
    }

    function renderResult(resultKey) {
        wizardState.currentStep = 3;
        wizardStepTracker.textContent = 'Recommendation Ready!';
        progressBar.style.width = '100%';

        wizardQuestionContainer.classList.add('hidden');
        wizardResultContainer.classList.remove('hidden');

        const rec = RECOMMENDATIONS[resultKey];
        if (!rec) return;

        wizardResultContainer.innerHTML = `
            <div class="rec-card">
                <div class="rec-badges-strip">
                    <span class="badge badge-tier">${rec.tier}</span>
                    <span class="badge badge-cost">${rec.costBadge}</span>
                    <span class="badge badge-privacy">${rec.privacyBadge}</span>
                </div>

                <h2>🌿 ${rec.title}</h2>
                <p class="rec-target"><strong>Ideal For:</strong> ${rec.target}</p>
                <p class="rec-description">${rec.description}</p>

                <div class="rec-section">
                    <h4>🚀 Quick Setup Steps</h4>
                    <ol class="rec-steps">
                        ${rec.steps.map(step => `<li>${step}</li>`).join('')}
                    </ol>
                </div>

                <div class="rec-section">
                    <div class="prompt-header">
                        <h4>📋 Sample Starter Prompt</h4>
                        <button id="btnCopyPrompt" class="btn-copy-sm">Copy Prompt</button>
                    </div>
                    <pre class="prompt-box"><code id="promptText">${rec.prompt}</code></pre>
                </div>

                ${rec.resources && rec.resources.length ? `
                <div class="rec-section rec-resources-block">
                    <h4>📚 Matching Community-Curated Resources</h4>
                    <div class="rec-resources-grid">
                        ${rec.resources.map(res => `
                            <div class="rec-resource-item">
                                <div class="res-item-title"><a href="${res.link}" target="_blank">${res.title} ↗</a></div>
                                <div class="res-item-author">By ${res.author}</div>
                                <div class="res-item-desc">${res.desc}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top: 1rem; text-align: right;">
                        <a href="index.html#resources" class="btn-secondary" style="font-size: 0.85rem; padding: 0.4rem 0.9rem;">Explore Full Resources Directory →</a>
                    </div>
                </div>
                ` : ''}

                <div class="rec-actions">
                    <a href="${rec.link}" target="_blank" class="btn-primary">Get Started with ${rec.title} ↗</a>
                    <button id="btnRestartResult" class="btn-secondary">🔄 Start Over</button>
                </div>
            </div>
        `;

        // Copy prompt functionality
        const btnCopyPrompt = document.getElementById('btnCopyPrompt');
        if (btnCopyPrompt) {
            btnCopyPrompt.addEventListener('click', () => {
                const promptText = document.getElementById('promptText').innerText;
                navigator.clipboard.writeText(promptText).then(() => {
                    btnCopyPrompt.textContent = '✓ Copied!';
                    setTimeout(() => {
                        btnCopyPrompt.textContent = 'Copy Prompt';
                    }, 2000);
                });
            });
        }

        const btnRestartResult = document.getElementById('btnRestartResult');
        if (btnRestartResult) {
            btnRestartResult.addEventListener('click', renderStep1);
        }
    }

    // Wizard Controls
    btnWizardBack.addEventListener('click', () => {
        if (wizardState.currentStep === 2) {
            renderStep1();
        } else if (wizardState.currentStep === 3) {
            renderStep2(wizardState.goal);
        }
    });

    btnWizardReset.addEventListener('click', renderStep1);

    // Initial Wizard render
    renderStep1();

    // ==================== VISUAL TREE MAP LOGIC ====================
    function renderVisualTree() {
        if (!treeGrid) return;

        const categories = [
            {
                title: '💬 Chat & Brainstorming',
                nodes: [
                    { id: 'chat_free_local', name: 'Ollama Desktop', badge: 'Free / Local' },
                    { id: 'chat_free_cloud', name: 'ChatGPT / Claude Free', badge: 'Free / Cloud' },
                    { id: 'chat_paid', name: 'Claude Pro / Plus', badge: 'Paid Pro' }
                ]
            },
            {
                title: '📊 RStudio & Data Stats',
                nodes: [
                    { id: 'data_rstudio_local', name: 'RStudio + chattr + Ollama', badge: 'Free / RStudio Local' },
                    { id: 'data_rstudio_cloud', name: 'RStudio + ellmer API', badge: 'Cloud API' },
                    { id: 'data_vscode', name: 'Positron / VS Code', badge: 'Hybrid IDE' }
                ]
            },
            {
                title: '🌐 Web Apps & Visualizers',
                nodes: [
                    { id: 'web_nocode', name: 'Lovable / Bolt.new', badge: 'No-Code Web Builder' },
                    { id: 'web_custom', name: 'VS Code + GitHub Pages', badge: 'Custom Code / Free Host' }
                ]
            },
            {
                title: '🎓 Learning & Student Perks',
                nodes: [
                    { id: 'learn_student', name: 'GitHub Copilot .edu Pack', badge: '100% Free (.edu)' },
                    { id: 'learn_general', name: 'Ollama + VS Code Sandbox', badge: 'Zero Cost Sandbox' }
                ]
            },
            {
                title: '💻 Professional Dev',
                nodes: [
                    { id: 'code_free', name: 'VS Code + Continue', badge: 'Free & Open Source' },
                    { id: 'code_pro', name: 'Cursor Pro / Claude Code', badge: 'Pro Repo Engine' }
                ]
            }
        ];

        treeGrid.innerHTML = categories.map(cat => `
            <div class="tree-column glass-panel-sm">
                <h4>${cat.title}</h4>
                <div class="tree-nodes-list">
                    ${cat.nodes.map(node => `
                        <div class="tree-node" data-node="${node.id}">
                            <div class="node-name">${node.name}</div>
                            <span class="node-tag">${node.badge}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Attach click listeners to visual nodes
        treeGrid.querySelectorAll('.tree-node').forEach(node => {
            node.addEventListener('click', () => {
                const nodeId = node.getAttribute('data-node');
                treeGrid.querySelectorAll('.tree-node').forEach(n => n.classList.remove('selected'));
                node.classList.add('selected');
                showNodeDetail(nodeId);
            });
        });
    }

    function showNodeDetail(nodeId) {
        const rec = RECOMMENDATIONS[nodeId];
        if (!rec || !nodeDetailDrawer || !nodeDetailContent) return;

        nodeDetailContent.innerHTML = `
            <div class="drawer-header">
                <span class="badge badge-tier">${rec.tier}</span>
                <span class="badge badge-cost">${rec.costBadge}</span>
                <span class="badge badge-privacy">${rec.privacyBadge}</span>
                <h3>🌿 ${rec.title}</h3>
            </div>
            <p><strong>Ideal For:</strong> ${rec.target}</p>
            <p>${rec.description}</p>
            <h4>Steps to Get Started:</h4>
            <ol class="rec-steps">
                ${rec.steps.map(s => `<li>${s}</li>`).join('')}
            </ol>
            <div class="drawer-actions">
                <a href="${rec.link}" target="_blank" class="btn-primary">Explore ${rec.title} ↗</a>
            </div>
        `;

        nodeDetailDrawer.classList.remove('hidden');
    }

    if (closeDrawerBtn) {
        closeDrawerBtn.addEventListener('click', () => {
            nodeDetailDrawer.classList.add('hidden');
        });
    }
});
