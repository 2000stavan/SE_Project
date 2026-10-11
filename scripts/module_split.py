#!/usr/bin/env python3
"""
Module-by-module repo builder for the ISMS hand-off (see github.md).

The finished project lives in one tree. This script slices it into 9 ordered modules so the
new repository can be built up in alternating pushes (odd modules: Dev, even: Stavan), and
every push still compiles.

  python scripts/module_split.py list                      # modules, owners, file counts
  python scripts/module_split.py check                     # every source file assigned to exactly 1 module?
  python scripts/module_split.py apply 3 ../isms-new       # copy module 3 (+ regenerate shared files) into a checkout
  python scripts/module_split.py verify [--tests]          # build modules 1..9 cumulatively in a temp dir,
                                                           # compile backend + type-check frontend at each step

`apply N` only ADDS module N's files and regenerates the two shared frontend files
(App.tsx, Layout.tsx) so they only mention modules 1..N. Run it after pulling the previous module.
"""
import fnmatch
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = "backend/src/main/java/com/isms"
T = "backend/src/test/java/com/isms"
R = "backend/src/main/resources"
F = "frontend/src"

DEV, STAVAN = "Dev", "Stavan"

# (id, name, owner, [glob patterns relative to repo root])
MODULES = [
    (1, "Foundation & Data Layer", DEV, [
        ".gitignore", ".env.example", "docker-compose.yml", "Makefile",
        "backend/pom.xml", "backend/mvnw", "backend/mvnw.cmd", "backend/.mvn/**", "backend/Dockerfile", "backend/storage/invoices/.gitkeep",
        f"{J}/IsmsApplication.java", f"{J}/config/AppProperties.java", f"{J}/error/**", f"{J}/model/**", f"{J}/repository/**",
        f"{J}/trace/**", f"{J}/adapter/MailerAdapter.java", f"{J}/adapter/ChannelAdapter.java", f"{J}/adapter/impl/SmtpMailerAdapter.java",
        f"{R}/application.yml", f"{R}/db/migration/**",
        f"{T}/SchemaMatchesSpecTest.java", "backend/src/test/resources/**",
        "frontend/package.json", "frontend/package-lock.json", "frontend/tsconfig.json", "frontend/vite.config.ts",
        "frontend/tailwind.config.js", "frontend/postcss.config.js", "frontend/index.html", "frontend/public/favicon.svg", "frontend/Dockerfile", "frontend/nginx.conf",
        f"{F}/index.css", f"{F}/api/client.ts",
        "moodle/moodle.md", "schema.md", "plan.md", "feature.md", "api-spec.md", "implementationplan.md", "agent-prompt.md", "docs/source/**",
    ]),
    (2, "Auth, RBAC, Audit & App Shell", STAVAN, [
        f"{J}/audit/**", f"{J}/security/**", f"{J}/domain/UserService.java", f"{J}/domain/AdministratorService.java",
        f"{J}/api/AuthController.java", f"{J}/api/UserController.java", f"{J}/api/AdminController.java",
        f"{J}/api/SettingsController.java", f"{J}/api/HealthController.java",
        f"{T}/AuthIntegrationTest.java", f"{T}/BcryptTest.java", f"{T}/RbacMatrixTest.java", f"{T}/AdminTest.java", f"{T}/HealthControllerTest.java",
        f"{F}/main.tsx", f"{F}/App.tsx", f"{F}/App.test.tsx", f"{F}/components/Layout.tsx", f"{F}/components/OnboardingModal.tsx", f"{F}/components/ThemeToggle.tsx", f"{F}/components/Logo.tsx",
        f"{F}/context/**", f"{F}/types/**", f"{F}/pages/auth/**", f"{F}/pages/dashboard/**", f"{F}/pages/admin/**",
    ]),
    (3, "Notifications & Real-time Channels", DEV, [
        f"{J}/domain/NotificationService.java", f"{J}/api/NotificationController.java", f"{J}/websocket/**",
        f"{J}/config/WebSocketConfig.java", f"{J}/adapter/impl/StubChannelAdapters.java",
        f"{F}/pages/notifications/**",
    ]),
    (4, "Inventory & Stock (C1)", STAVAN, [
        f"{J}/domain/ProductService.java", f"{J}/domain/StockRecordService.java",
        f"{J}/api/ProductController.java", f"{J}/api/StockController.java",
        f"{T}/StockConcurrencyTest.java",
        f"{F}/pages/inventory/**",
    ]),
    (5, "Suppliers (C2a)", DEV, [
        f"{J}/domain/SupplierService.java", f"{J}/api/SupplierController.java",
        f"{F}/pages/suppliers/**",
    ]),
    (6, "Purchase Orders, Receiving & Voice (C2b, C1.7)", STAVAN, [
        f"{J}/domain/PurchaseOrderService.java", f"{J}/domain/ManagerService.java", f"{J}/domain/WarehouseStaffService.java",
        f"{J}/domain/voice/**", f"{J}/api/PurchaseOrderController.java", f"{J}/api/VoiceController.java",
        f"{T}/Seq1InventoryTest.java", f"{T}/Seq2PurchaseOrderTest.java", f"{T}/PoStateMachineTest.java", f"{T}/VoiceInterpreterTest.java",
        f"{F}/pages/purchaseOrders/**", f"{F}/pages/voice/**",
    ]),
    (7, "Forecasting & Analytics (E1)", DEV, [
        f"{J}/domain/ForecastService.java", f"{J}/api/ForecastController.java", f"{J}/api/AnalyticsController.java",
        f"{T}/ForecastTest.java",
        f"{F}/pages/forecast/**",
    ]),
    (8, "Sales, POS & Marketplace Webhooks (C3)", STAVAN, [
        f"{J}/domain/SalesOrderService.java", f"{J}/domain/SalesPersonnelService.java", f"{J}/api/SalesController.java",
        f"{T}/Seq3SalesTest.java", f"{T}/WebhookSecurityTest.java",
        "scripts/simulate_marketplace.sh",
        f"{F}/pages/sales/**",
    ]),
    (9, "Demo Data, Hardening & Docs", DEV, [
        f"{J}/config/DemoDataSeeder.java", f"{R}/application-demo.yml",
        f"{T}/NfrTest.java", f"{T}/ClassContractTest.java", f"{T}/ClassDiagramStructureTest.java",
        "scripts/load_test.sh", "scripts/smoke_test.sh", "scripts/module_split.py",
        "README.md", "PROGRESS.md", "docs/traceability.md", "docs/class-diagram-mapping.md", "github.md",
    ]),
]

# Shared frontend files are regenerated per stage: lines that mention a not-yet-pushed module's page are dropped.
APP_DROP = {
    3: ["NotificationsPage", "NotificationPreferencesPage"],
    4: ["InventoryPage"],
    5: ["SuppliersPage"],
    6: ["PurchaseOrdersPage", "VoiceCommandPage"],
    7: ["ForecastPage"],
    8: ["SalesPage"],
}
NAV_DROP = {
    3: ["path: '/notifications'"],
    4: ["path: '/inventory'"],
    5: ["path: '/suppliers'"],
    6: ["path: '/purchase-orders'", "path: '/voice'"],
    7: ["path: '/forecast'"],
    8: ["path: '/sales'"],
}

EXCLUDE_DIRS = {"node_modules", "target", "dist", ".git", ".claude", "__pycache__"}
EXCLUDE_TOP = {"isms"}  # stale duplicate of the design docs stays out of the new repo
KEEP_MOODLE = {"moodle/moodle.md"}  # the consolidated requirements; the course PDFs stay out
EXCLUDE_FILES = {"backend-run.log", "github2.md"}  # github2.md is for the old (lala) repo only


def all_files():
    out = []
    for p in ROOT.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if rel.parts[0] == "moodle" and rel.as_posix() not in KEEP_MOODLE:
            continue
        if set(rel.parts) & EXCLUDE_DIRS or rel.parts[0] in EXCLUDE_TOP or rel.name in EXCLUDE_FILES:
            continue
        if rel.parts[:3] == ("backend", "storage", "invoices") and rel.name != ".gitkeep":
            continue
        out.append(rel.as_posix())
    return sorted(out)


def match(rel, pattern):
    if pattern.endswith("/**"):
        return rel.startswith(pattern[:-3] + "/")
    return fnmatch.fnmatch(rel, pattern)


def module_files(files, mid):
    pats = next(m[3] for m in MODULES if m[0] == mid)
    return [f for f in files if any(match(f, p) for p in pats)]


def cmd_list():
    files = all_files()
    for mid, name, owner, _ in MODULES:
        print(f"M{mid}  {owner:<7} {len(module_files(files, mid)):>3} files  {name}")


def cmd_check():
    files = all_files()
    owners = {}
    for mid, *_ in MODULES:
        for f in module_files(files, mid):
            owners.setdefault(f, []).append(mid)
    unassigned = [f for f in files if f not in owners]
    dup = {f: m for f, m in owners.items() if len(m) > 1}
    for f in unassigned:
        print("UNASSIGNED", f)
    for f, m in dup.items():
        print("DUPLICATE ", f, m)
    print(f"{len(files)} files, {len(unassigned)} unassigned, {len(dup)} duplicated")
    return 0 if not unassigned and not dup else 1


def filter_lines(text, needles):
    return "".join(l for l in text.splitlines(keepends=True) if not any(n in l for n in needles))


def prune_lucide(text):
    m = re.search(r"import \{([^}]*)\} from 'lucide-react';", text, re.S)
    if not m:
        return text
    names = [n.strip() for n in m.group(1).split(",") if n.strip()]
    rest = text[:m.start()] + text[m.end():]
    keep = [n for n in names if re.search(r"\b" + re.escape(n) + r"\b", rest)]
    body = ",\n  ".join(keep)
    return text[:m.start()] + "import {\n  " + body + ",\n} from 'lucide-react';" + text[m.end():]


def shared_file(rel, upto):
    src = (ROOT / rel).read_text(encoding="utf8")
    table = APP_DROP if rel.endswith("App.tsx") else NAV_DROP
    needles = [n for mid, ns in table.items() if mid > upto for n in ns]
    out = filter_lines(src, needles)
    if rel.endswith("Layout.tsx"):
        out = prune_lucide(out)
    return out


def cmd_apply(n, dest):
    dest = Path(dest).resolve()
    files = all_files()
    mine = module_files(files, n)
    for rel in mine:
        tgt = dest / rel
        tgt.parent.mkdir(parents=True, exist_ok=True)
        if rel in (f"{F}/App.tsx", f"{F}/components/Layout.tsx"):
            tgt.write_text(shared_file(rel, n), encoding="utf8", newline="\n")
        else:
            shutil.copy2(ROOT / rel, tgt)
    if n > 2:  # regenerate shared files for this stage
        for rel in (f"{F}/App.tsx", f"{F}/components/Layout.tsx"):
            (dest / rel).write_text(shared_file(rel, n), encoding="utf8", newline="\n")
    print(f"M{n}: copied {len(mine)} files into {dest}" + (" (+ regenerated App.tsx, Layout.tsx)" if n > 2 else ""))


def run(cmd, cwd, env=None):
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=True, text=True, env=env)


def cmd_verify(with_tests):
    tmp = Path(tempfile.mkdtemp(prefix="isms-split-"))
    print("workdir:", tmp)
    (tmp / "frontend").mkdir(parents=True)
    nm_src, nm_dst = ROOT / "frontend" / "node_modules", tmp / "frontend" / "node_modules"
    if nm_src.exists():  # reuse installed deps instead of reinstalling per step
        if os.name == "nt":
            subprocess.run(f'cmd /c mklink /J "{nm_dst}" "{nm_src}"', shell=True, capture_output=True)
        else:
            nm_dst.symlink_to(nm_src, target_is_directory=True)
    ok = True
    mvn = ".\\mvnw.cmd" if os.name == "nt" else "./mvnw"
    for mid, name, *_ in MODULES:
        cmd_apply(mid, tmp)
        goal = "test" if with_tests else "test-compile"
        r = run(f"{mvn} -q {goal}", tmp / "backend")
        be = r.returncode == 0
        r2 = run("npx tsc --noEmit", tmp / "frontend") if mid >= 2 else None
        fe = True if r2 is None else r2.returncode == 0
        print(f"  M{mid} backend {goal}: {'OK' if be else 'FAIL'}   frontend tsc: {'OK' if fe else 'FAIL'}   ({name})")
        if not be:
            print((r.stdout + r.stderr)[-1500:])
        if not fe:
            print((r2.stdout + r2.stderr)[-1500:])
        ok = ok and be and fe
        if not ok:
            break
    print("ALL MODULES BUILD" if ok else "FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "list":
        cmd_list()
    elif a[0] == "check":
        sys.exit(cmd_check())
    elif a[0] == "apply" and len(a) == 3:
        cmd_apply(int(a[1]), a[2])
    elif a[0] == "verify":
        sys.exit(cmd_verify("--tests" in a))
    else:
        print(__doc__)
        sys.exit(2)
