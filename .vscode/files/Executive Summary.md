Executive Summary
This document provides a comprehensive business analysis, solution architecture, and detailed workplan for the Pricing Calculator Application. Driven by updated business requirements, the application will digitize the manual product costing process found in the provided sample data. The updated strategy prioritizes a local-first, offline-capable desktop architecture to ensure privacy, low memory consumption, and zero recurring cloud hosting costs. The solution introduces dynamic Unit of Measure (UOM) conversions to handle raw material scaling and an automated profit alert system to safeguard target margins.
1. Sample Data Analysis and Findings
An analysis of the sample data reveals a structured costing model separated into variable costs, production assumptions, and a pricing summary. 
•	Costing Structure: The tool lists standard baking ingredients with corresponding quantities, units (e.g., cups, tsp, pcs), and batch costs based on unit prices. 
•	Production Overheads: The model tracks batch yields (12.00 muffins), labor (P50.00), and utility overheads (P10.00) to arrive at a total batch cost. 
•	Pricing Targets: Markups are applied distinctly for retail (50%) and reseller (20%) tiers. 
•	Data Clarifications Resolved:
o	Unit Economics: The sample data presented static unit costs (e.g., P12.50 per 1.50 cups of flour). The business has confirmed the need for a dynamic conversion engine that normalizes bulk purchase units (e.g., kilograms) into recipe units (e.g., cups) using density/yield factors. 
o	Orphaned Variable: The "Desired profit per batch (P50.00)" data point has been confirmed as an active business rule, serving as a conditional alert if the actual gross profit falls below this threshold. 
2. Pricing Logic and Business Rules
The local calculation engine must enforce the following formulas to replicate and enhance the sample data: 
Dynamic Unit Conversion Rules:
•	Normalized Unit Cost = Purchase Price ÷ Yield Factor (e.g., P50.00 per kg ÷ 8.00 cups yield = P6.25 per cup).
•	Batch Cost per Ingredient = Recipe Qty × Normalized Unit Cost.
Total Cost Rules:
•	Total Variable Cost/Batch = Sum of all individual Ingredient Batch Costs (e.g., P162.78). 
•	Total Cost/Batch = Total Variable Cost/Batch + Labor + Electricity/Gas + Other overhead (e.g., P162.78 + P50.00 + P10.00 + P0.00 = P222.78). 
•	Cost Per Item = Total Cost/Batch ÷ Muffins produced per batch (e.g., P222.78 ÷ 12 = P18.56). 
Pricing & Profitability Rules:
•	Retail Price/Item = Cost Per Item × (1 + Target markup %) (e.g., P18.56 × 1.50 = P27.85). 
•	Gross Profit/Batch = (Retail Price/Item × Muffins produced) - Total Cost/Batch (e.g., P334.17 - P222.78 = P111.39). 
•	Reseller Price/Item = Cost Per Item × (1 + Reseller markup %) (e.g., P18.56 × 1.20 = P22.28). 
•	Profit Alert System: IF [Gross Profit/Batch] < [Desired profit per batch] THEN [State = Warning]. (e.g., comparing actual P111.39 against the target of P50.00). 
3. Application Scope and Requirements
To meet the requirement for a strictly local, laptop-based deployment, the application will be built as a lightweight, offline-first desktop executable.
•	Frontend (React or Vue.js): Provides a reactive, spreadsheet-like interface for the Recipe Builder and Margin Configurator, ensuring instant recalculation when quantities change.
•	Application Wrapper (Tauri): Packages the web frontend into a native desktop application using the OS's native webview. This replaces heavy frameworks like Electron, drastically reducing app size and RAM consumption to preserve battery life.
•	Local Database (SQLite): A serverless, file-based relational database stored entirely on the user's local hard drive. It securely houses the Ingredient Master (with UOM yield factors) and saved recipe history without requiring internet access.
•	Backend Logic (Rust): Tauri's native Rust backend will securely interface with SQLite and rapidly execute the pricing algorithms before passing the data to the frontend.

4. Detailed Project Workplan
Phase	Task ID	Task Description	Key Activities	Deliverable	Dependencies	Effort (Days)	Role	Priority
1. Business Analysis	1.1	Rule Extraction	Map formulas from sample PDF	Final Data Dictionary	None	2	BA	High
1. Business Analysis	1.2	UOM Yield Mapping	Define density yield factors (kg to cups) for common baking ingredients	UOM Conversion Matrix	1.1	3	BA	High
2. Design	2.1	UI/UX Wireframing	Design screens for Ingredient Master, Recipe Builder, and conditional Red/Green Profit Alerts	High-Fidelity Wireframes	1.2	4	UI/UX	High
2. Design	2.2	SQLite DB Schema	Design tables for Ingredients, Purchase Units, Yield Factors, and Settings	SQLite Schema Doc	1.2	3	Architect	High
3. Development	3.1	Tauri Rust Backend	Build local IPC commands for UOM math and profit alert checks	Core Engine API	2.2	6	Backend Dev	High
3. Development	3.2	Ingredient UI Module	Build React frontend for editing bulk purchase costs and UOM yields	Functional UI	3.1	5	Frontend Dev	Med
3. Development	3.3	Batch Costing UI	Build dynamic frontend for recipe building and margin calculation	Functional UI	3.2	6	Frontend Dev	High
4. Testing	4.1	System Integration	Test offline SQLite performance and Tauri build processes	Test Execution Report	3.3	4	QA	High
4. Testing	4.2	User Acceptance	Business users test application with diverse UOMs and scenarios	UAT Sign-off	4.1	3	BA	High
5. Deployment	5.1	App Packaging	Compile native Windows/macOS .exe / .dmg installers via Tauri	Production Installers	4.2	2	DevOps	High
5. Deployment	5.2	Knowledge Transfer	Provide user manuals for installing the app and managing local DB files	Training Manuals	5.1			


5. Project Timeline and Milestones
With the inclusion of local database setup and UOM conversion mapping, the project effort totals 40 person-days.
•	Total Duration: 5 Calendar Weeks.
•	Milestone 1 (End of Week 1): Business Rules Finalized & UOM Metrics Approved.
•	Milestone 2 (End of Week 3): SQLite Schema Implemented & Rust Backend Complete.
•	Milestone 3 (End of Week 4): Frontend UI Complete & Integrated; SIT Commences.
•	Milestone 4 (End of Week 5): UAT Sign-off, Tauri Desktop Installers Delivered, and Go-Live.
6. Risks, Dependencies, and Assumptions
•	Assumption: The business uses standard baking ingredients where volume-to-weight conversions (Yield Factors) can be reliably standardized.
•	Risk: Because SQLite operates entirely locally on the laptop, a hardware failure could result in the loss of all saved recipes and pricing history.
o	Mitigation: The application must include an automated or manual "Export to JSON/CSV" feature allowing the user to easily back up their data locally or to a personal cloud drive (like Google Drive).

