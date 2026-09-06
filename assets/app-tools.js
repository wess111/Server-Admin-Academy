/* Tools: client-side Word (.doc) generator using HTML + Blob
   - Works on GitHub Pages (static)
   - Documents are generated locally in the browser
*/

(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function toLines(text) {
    const t = String(text ?? "").trim();
    if (!t) return [];
    return t.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  }

  function htmlDoc({ title, headerRight, sections }) {
    const now = new Date();
    const date = now.toLocaleString(undefined, { year: "numeric", month: "long", day: "numeric" });

    const sectionHtml = sections
      .map((s) => {
        if (!s) return "";
        const body = s.bodyHtml || "";
        return `
          <div class="sec">
            <div class="secTitle">${esc(s.title)}</div>
            <div class="secBody">${body}</div>
          </div>
        `;
      })
      .join("\n");

    return `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>${esc(title)}</title>
        <style>
          @page { margin: 1in; }
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
          .hdr { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 16px; }
          .hdrTop { display: flex; justify-content: space-between; align-items: flex-end; gap: 14px; }
          .h1 { font-size: 18pt; font-weight: 700; margin: 0; }
          .meta { font-size: 10pt; color: #444; margin-top: 6px; }
          .sec { margin: 14px 0; }
          .secTitle { font-size: 12pt; font-weight: 700; margin: 0 0 6px; }
          .secBody { margin: 0; line-height: 1.35; }
          .kv { width: 100%; border-collapse: collapse; margin-top: 6px; }
          .kv td { border: 1px solid #e6e6e6; padding: 8px 10px; vertical-align: top; }
          .k { width: 32%; font-weight: 700; background: #fafafa; }
          ul { margin: 6px 0 0 18px; }
          .pill { display: inline-block; padding: 3px 8px; border-radius: 999px; background: #eef6ff; border: 1px solid #d7e9ff; font-size: 10pt; }
          .small { font-size: 10pt; color: #444; }
          .sp { height: 8px; }
        </style>
      </head>
      <body>
        <div class="hdr">
          <div class="hdrTop">
            <div>
              <div class="h1">${esc(title)}</div>
              <div class="meta">Generated: ${esc(date)}</div>
            </div>
            <div class="small">${esc(headerRight || "")}</div>
          </div>
        </div>

        ${sectionHtml}
      </body>
      </html>
    `;
  }

  function downloadWord({ filename, html }) {
    const blob = new Blob([html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".doc") ? filename : `${filename}.doc`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function tableKV(rows) {
    const tr = rows
      .map(([k, v]) => {
        const val = String(v ?? "").trim();
        return `
          <tr>
            <td class="k">${esc(k)}</td>
            <td>${esc(val) || "&nbsp;"}</td>
          </tr>
        `;
      })
      .join("\n");
    return `<table class="kv">${tr}</table>`;
  }

  function bullets(text) {
    const lines = toLines(text);
    if (!lines.length) return "<div class=\"small\">(Not provided)</div>";
    return `<ul>${lines.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
  }

  // ------------------ Change Management ------------------
  function initChangeMgmt() {
    const root = $("[data-tool='change']");
    if (!root) return;

    const get = (id) => $(`#${id}`, root)?.value || "";

    $("#btnGenerate", root).addEventListener("click", (e) => {
      e.preventDefault();

      const title = get("cr_title") || "Change Request";
      const system = get("cr_system");
      const env = get("cr_env");
      const window = get("cr_window");
      const risk = get("cr_risk");
      const requestor = get("cr_requestor");
      const owner = get("cr_owner");

      const justification = get("cr_justification");
      const scope = get("cr_scope");
      const impl = get("cr_impl");
      const rollback = get("cr_rollback");
      const validation = get("cr_validation");
      const comms = get("cr_comms");
      const dependencies = get("cr_dependencies");

      const doc = htmlDoc({
        title: `Change Request: ${title}`,
        headerRight: system ? `System: ${system}` : "",
        sections: [
          {
            title: "Overview",
            bodyHtml: tableKV([
              ["Change Title", title],
              ["System / Service", system],
              ["Environment", env],
              ["Maintenance Window", window],
              ["Risk Level", risk],
              ["Requested By", requestor],
              ["Change Owner", owner],
            ]),
          },
          { title: "Business Justification", bodyHtml: `<div>${esc(justification) || "&nbsp;"}</div>` },
          { title: "Scope", bodyHtml: `<div>${esc(scope) || "&nbsp;"}</div>` },
          { title: "Implementation Plan", bodyHtml: bullets(impl) },
          { title: "Rollback Plan", bodyHtml: bullets(rollback) },
          { title: "Validation Plan", bodyHtml: bullets(validation) },
          { title: "Communication Plan", bodyHtml: bullets(comms) },
          { title: "Dependencies / Preconditions", bodyHtml: bullets(dependencies) },
          {
            title: "Approval",
            bodyHtml:
              "<div class=\"small\">Sign-off fields can be completed by the reviewer.</div>" +
              "<div class=\"sp\"></div>" +
              tableKV([
                ["Approved By", ""],
                ["Approval Date", ""],
                ["Notes", ""],
              ]),
          },
        ],
      });

      const safeName = title.replace(/[^a-z0-9\-\_\s]/gi, "").trim().replace(/\s+/g, " ");
      downloadWord({ filename: `Change-Request - ${safeName || "CR"}`.trim(), html: doc });
    });
  }

  // ------------------ Policy / Procedure ------------------
  function initPolicyProcedure() {
    const root = $("[data-tool='policy']");
    if (!root) return;

    const get = (id) => $(`#${id}`, root)?.value || "";
    const modeSel = $("#pp_type", root);
    const modeText = () => (modeSel?.value || "policy");

    $("#btnGenerate", root).addEventListener("click", (e) => {
      e.preventDefault();

      const kind = modeText();
      const title = get("pp_title") || (kind === "procedure" ? "Procedure" : "Policy");
      const dept = get("pp_dept");
      const owner = get("pp_owner");
      const version = get("pp_version");
      const effective = get("pp_effective");

      const purpose = get("pp_purpose");
      const scope = get("pp_scope");
      const roles = get("pp_roles");
      const standards = get("pp_standards");
      const steps = get("pp_steps");
      const validation = get("pp_validation");
      const exceptions = get("pp_exceptions");
      const references = get("pp_references");

      const isProcedure = kind === "procedure";

      const sections = [
        {
          title: "Document Control",
          bodyHtml: tableKV([
            ["Title", title],
            ["Type", isProcedure ? "Procedure" : "Policy"],
            ["Department / Team", dept],
            ["Owner", owner],
            ["Version", version],
            ["Effective Date", effective],
          ]),
        },
        { title: "Purpose", bodyHtml: `<div>${esc(purpose) || "&nbsp;"}</div>` },
        { title: "Scope", bodyHtml: `<div>${esc(scope) || "&nbsp;"}</div>` },
        { title: "Roles & Responsibilities", bodyHtml: bullets(roles) },
      ];

      if (!isProcedure) {
        sections.push({ title: "Policy Statement / Standards", bodyHtml: bullets(standards) });
        sections.push({ title: "Exceptions", bodyHtml: bullets(exceptions) });
      } else {
        sections.push({ title: "Prerequisites / Standards", bodyHtml: bullets(standards) });
        sections.push({ title: "Procedure Steps", bodyHtml: bullets(steps) });
        sections.push({ title: "Validation / Verification", bodyHtml: bullets(validation) });
      }

      sections.push({ title: "References", bodyHtml: bullets(references) });

      const doc = htmlDoc({
        title: `${isProcedure ? "Procedure" : "Policy"}: ${title}`,
        headerRight: dept ? `Team: ${dept}` : "",
        sections,
      });

      const safeName = title.replace(/[^a-z0-9\-\_\s]/gi, "").trim().replace(/\s+/g, " ");
      downloadWord({ filename: `${isProcedure ? "Procedure" : "Policy"} - ${safeName || "Document"}`.trim(), html: doc });
    });
  }

  // ------------------ Configuration Report ------------------
  function initConfigReport() {
    const root = $("[data-tool='report']");
    if (!root) return;

    const get = (id) => $(`#${id}`, root)?.value || "";

    $("#btnGenerate", root).addEventListener("click", (e) => {
      e.preventDefault();

      const title = get("rp_title") || "Configuration Report";
      const system = get("rp_system");
      const role = get("rp_role");
      const version = get("rp_version");
      const author = get("rp_author");
      const date = get("rp_date");

      const objectives = get("rp_objectives");
      const architecture = get("rp_architecture");
      const configuration = get("rp_configuration");
      const validation = get("rp_validation");
      const operations = get("rp_operations");
      const risks = get("rp_risks");
      const future = get("rp_future");

      const doc = htmlDoc({
        title: title,
        headerRight: system ? `System: ${system}` : "",
        sections: [
          {
            title: "Report Summary",
            bodyHtml: tableKV([
              ["System", system],
              ["Role / Service", role],
              ["Version", version],
              ["Author", author],
              ["Report Date", date],
            ]),
          },
          { title: "Objectives", bodyHtml: bullets(objectives) },
          { title: "Architecture Overview", bodyHtml: `<div>${esc(architecture) || "&nbsp;"}</div>` },
          { title: "Configuration Details", bodyHtml: bullets(configuration) },
          { title: "Validation / Evidence", bodyHtml: bullets(validation) },
          { title: "Operational Notes", bodyHtml: bullets(operations) },
          { title: "Risks / Considerations", bodyHtml: bullets(risks) },
          { title: "Future Improvements", bodyHtml: bullets(future) },
        ],
      });

      const safeName = `${system || "System"} - ${role || "Service"}`
        .replace(/[^a-z0-9\-\_\s]/gi, "")
        .trim()
        .replace(/\s+/g, " ");
      downloadWord({ filename: `Configuration-Report - ${safeName || "Report"}`.trim(), html: doc });
    });
  }

  // ------------------ Init ------------------
  document.addEventListener("DOMContentLoaded", () => {
    initChangeMgmt();
    initPolicyProcedure();
    initConfigReport();
  });
})();
