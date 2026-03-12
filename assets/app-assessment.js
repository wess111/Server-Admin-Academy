.assessmentHero {
  padding-bottom: 2rem;
}

.assessmentHeroContent {
  max-width: 920px;
}

.assessmentEyebrow,
.cardEyebrow {
  margin: 0 0 0.4rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #7dd3fc;
}

.assessmentShellSection {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.assessmentShell {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.assessmentSidebar {
  position: sticky;
  top: 1rem;
}

.sidebarCard,
.assessmentCard {
  background: rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
  box-shadow: 0 16px 38px rgba(2, 6, 23, 0.28);
  backdrop-filter: blur(12px);
}

.sidebarCard {
  padding: 1rem;
}

.sidebarTitle {
  font-size: 1rem;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 1rem;
}

.assessmentNav {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.assessmentNavBtn {
  width: 100%;
  text-align: left;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.55);
  color: #e2e8f0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  cursor: pointer;
  font: inherit;
  transition: 0.18s ease;
}

.assessmentNavBtn:hover,
.assessmentNavBtn.isActive {
  background: rgba(37, 99, 235, 0.22);
  border-color: rgba(96, 165, 250, 0.45);
  color: #ffffff;
}

.sidebarMeta {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
}

.metaRow {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.55rem;
}

.metaLabel {
  color: #94a3b8;
  font-size: 0.92rem;
}

.metaValue {
  color: #f8fafc;
  font-weight: 600;
  font-size: 0.92rem;
}

.assessmentMain {
  min-width: 0;
}

.cardHeader {
  padding: 1rem 1.2rem 0.35rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.cardTitle {
  margin: 0 0 0.75rem;
  color: #f8fafc;
  font-size: 1.25rem;
}

.cardBody {
  padding: 1.2rem;
  min-height: 420px;
}

.workspaceFooter {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.2rem 1.2rem;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.workspaceFooterRight {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.workspaceStepText {
  color: #94a3b8;
  font-size: 0.95rem;
}

.scenarioText,
.activityPrompt,
.resultsText,
.reviewText {
  color: #e2e8f0;
  line-height: 1.68;
}

.referenceCard {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.referenceTitle {
  margin: 0 0 0.75rem;
  color: #f8fafc;
  font-size: 1rem;
}

.referenceTable {
  width: 100%;
  border-collapse: collapse;
}

.referenceTable td {
  padding: 0.65rem 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
  color: #e2e8f0;
  vertical-align: top;
}

.referenceTable td:first-child {
  color: #94a3b8;
  width: 220px;
}

.assessmentSelect,
.inlineSelect,
.matchSelect,
.reportInput {
  width: 100%;
  max-width: 460px;
  padding: 0.72rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.82);
  color: #f8fafc;
  font: inherit;
}

.inlineSelect {
  display: inline-block;
  width: auto;
  min-width: 180px;
  max-width: 240px;
  margin: 0 0.2rem;
  vertical-align: middle;
}

.scriptBlock {
  margin: 0;
  padding: 1rem;
  border-radius: 14px;
  background: #0b1220;
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #dbeafe;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 0.95rem;
  line-height: 1.7;
  white-space: pre-wrap;
  overflow-x: auto;
}

.matchGrid {
  display: grid;
  gap: 0.85rem;
}

.matchRow {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(240px, 300px);
  gap: 1rem;
  align-items: center;
  padding: 0.85rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.matchPromptText {
  color: #e2e8f0;
}

.orderLayout {
  display: grid;
  grid-template-columns: minmax(240px, 1fr) 78px minmax(240px, 1fr);
  gap: 1rem;
  align-items: start;
}

.orderPanel {
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.45);
  padding: 0.9rem;
}

.orderPanelTitle {
  margin: 0 0 0.9rem;
  color: #f8fafc;
  font-size: 1rem;
}

.orderList {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.orderItem {
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #e2e8f0;
  cursor: grab;
  user-select: none;
}

.orderItem.dragging {
  opacity: 0.45;
}

.orderItem.isSelected {
  outline: 2px solid rgba(96, 165, 250, 0.65);
}

.orderDropzone {
  min-height: 56px;
  border: 1px dashed rgba(125, 211, 252, 0.35);
  border-radius: 12px;
  padding: 0.35rem;
  background: rgba(15, 23, 42, 0.28);
}

.orderControls {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.8rem;
  align-items: center;
}

.orderControlBtn {
  width: 46px;
  height: 46px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.8);
  color: #f8fafc;
  cursor: pointer;
  font-size: 1rem;
}

.multiGrid {
  display: grid;
  gap: 0.75rem;
}

.multiOption {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
}

.multiOption input {
  margin-top: 0.15rem;
}

.reviewList,
.resultList {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.reviewItem,
.resultItem {
  padding: 0.85rem 0.95rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
}

.resultItem.isCorrect {
  border-color: rgba(34, 197, 94, 0.45);
}

.resultItem.isIncorrect {
  border-color: rgba(248, 113, 113, 0.45);
}

.reportBox {
  margin-top: 1rem;
  display: grid;
  gap: 0.8rem;
}

.reportRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.8rem;
}

.reportInput {
  max-width: 360px;
}

.assessmentBtn {
  border: none;
  border-radius: 12px;
  padding: 0.8rem 1.1rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.assessmentBtnPrimary {
  background: linear-gradient(135deg, #2563eb, #0ea5e9);
  color: #fff;
}

.assessmentBtnSecondary {
  background: rgba(15, 23, 42, 0.85);
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.18);
}

.assessmentBtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .assessmentShell {
    grid-template-columns: 1fr;
  }

  .assessmentSidebar {
    position: static;
  }
}

@media (max-width: 900px) {
  .orderLayout {
    grid-template-columns: 1fr;
  }

  .orderControls {
    flex-direction: row;
  }

  .matchRow {
    grid-template-columns: 1fr;
  }

  .workspaceFooter {
    flex-direction: column;
    align-items: stretch;
  }

  .workspaceFooterRight {
    justify-content: space-between;
  }
}
