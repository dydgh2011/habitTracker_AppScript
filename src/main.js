/**
 * =========================================================
 * 🏆 2026 HABIT TRACKER - v3.1 FULLY FIXED
 * =========================================================
 * FIXES:
 * - Header backgrounds span full width (text only in col A)
 * - Fixed formula parse errors in monthly heatmap
 * - Dashboard charts now show data properly
 * - Monthly charts display correctly
 */

// 1. GLOBAL CONFIGURATION
const CONFIG = {
    YEAR: 2026,

    sections: {
        dailyGoals: {
            headerRow: 2,
            startRow: 3,
            defaultCount: 4,
            label: "🟢 DAILY GOALS"
        },
        monthlyGoals: {
            headerRow: 8,
            startRow: 9,
            defaultCount: 3,
            label: "🔴 MONTHLY GOALS"
        },
        morning: {
            headerRow: 13,
            startRow: 14,
            defaultCount: 1,
            label: "☀️ MORNING",
            metrics: ["Wake Up Time"]
        },
        focus: {
            headerRow: 17,
            startRow: 18,
            defaultCount: 1,
            label: "🧠 FOCUS",
            metrics: ["Study (Hours)"]
        },
        gym: {
            headerRow: 21,
            startRow: 22,
            defaultCount: 3,
            label: "💪 GYM",
            metrics: ["Bench (Max)", "Squat (Max)", "Deadlift (Max)"]
        }
    },

    colors: {
        weekend: "#f8f9fa",
        today: "#fff3cd",
        header: "#1a73e8",
        headerText: "#ffffff",
        dailyGoalsBg: "#e8f5e9",
        monthlyGoalsBg: "#fce8e6",
        chartBlue: "#4285F4",
        chartRed: "#EA4335",
        chartYellow: "#FBBC04",
        chartGreen: "#34A853",
        chartOrange: "#FF6D01",
        chartPurple: "#9C27B0",
        lightGray: "#f1f3f4"
    }
};

/**
 * 🟢 ON OPEN TRIGGER
 */
function onOpen() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🏆 Habit Tracker')
        .addItem('🚀 Setup/Reset System', 'setupYearlySystem')
        .addItem('🔄 Refresh Dashboard', 'refreshDashboard')
        .addSeparator()
        .addItem('⚠️ Factory Reset', 'factoryReset')
        .addToUi();
}

/**
 * 🚀 MAIN SETUP FUNCTION
 */
function setupYearlySystem() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    months.forEach((month, index) => {
        let sheet = ss.getSheetByName(month);
        if (!sheet) { sheet = ss.insertSheet(month, index + 1); }
        sheet.clear();
        designMonthlySheet(sheet, month, index);
    });

    SpreadsheetApp.flush();

    createLiveDashboard(ss);

    const start = ss.getSheetByName("Start");
    if (start) ss.deleteSheet(start);
    const sheet1 = ss.getSheetByName("Sheet1");
    if (sheet1) ss.deleteSheet(sheet1);

    const dashboard = ss.getSheetByName("📊 Dashboard");
    if (dashboard) ss.setActiveSheet(dashboard);

    SpreadsheetApp.getUi().alert("✅ System Ready!\n\nYour habit tracker is set up. Start tracking!");
}

/**
 * 🔄 REFRESH DASHBOARD
 */
function refreshDashboard() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    createLiveDashboard(ss);
    SpreadsheetApp.getUi().alert("✅ Dashboard Refreshed!");
}

/**
 * 🧹 FACTORY RESET
 */
function factoryReset() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert('⚠️ Confirm Reset', 'This will delete ALL sheets and data. Are you sure?', ui.ButtonSet.YES_NO);

    if (response == ui.Button.YES) {
        const sheets = ss.getSheets();
        const temp = ss.insertSheet("Resetting...");
        sheets.forEach(s => { try { ss.deleteSheet(s); } catch (e) { } });
        temp.setName("Start");
        ui.alert("✨ Reset Complete. Click 'Setup/Reset System' to rebuild.");
    }
}

/**
 * 🎨 MONTHLY SHEET DESIGNER
 */
function designMonthlySheet(sheet, monthName, monthIndex) {
    const S = CONFIG.sections;

    const daysInMonth = new Date(CONFIG.YEAR, monthIndex + 1, 0).getDate();

    const neededCols = daysInMonth + 5;
    if (sheet.getMaxColumns() < neededCols) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), neededCols - sheet.getMaxColumns());
    }

    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidths(2, daysInMonth, 38);

    sheet.setFrozenColumns(1);
    sheet.setFrozenRows(1);

    // TITLE
    sheet.getRange("A1").setValue(monthName + " '" + CONFIG.YEAR.toString().slice(-2))
        .setFontSize(18)
        .setFontWeight("bold")
        .setFontFamily("Arial")
        .setFontColor(CONFIG.colors.header);

    let days = [];
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    sheet.getRange(1, 2, 1, daysInMonth)
        .setValues([days])
        .setFontWeight("bold")
        .setFontSize(10)
        .setHorizontalAlignment("center");

    // DAILY GOALS SECTION
    // FIXED: Background spans full width, text only in A
    sheet.getRange(S.dailyGoals.headerRow, 1, 1, daysInMonth + 1)
        .setBackground(CONFIG.colors.dailyGoalsBg);
    sheet.getRange(S.dailyGoals.headerRow, 1)
        .setValue(S.dailyGoals.label)
        .setFontWeight("bold")
        .setFontSize(11);

    for (let i = 0; i < S.dailyGoals.defaultCount; i++) {
        const row = S.dailyGoals.startRow + i;
        sheet.getRange(row, 1).setValue("Daily Goal " + (i + 1));
        sheet.getRange(row, 2, 1, daysInMonth).insertCheckboxes();
    }

    // MONTHLY GOALS SECTION
    sheet.getRange(S.monthlyGoals.headerRow, 1, 1, daysInMonth + 1)
        .setBackground(CONFIG.colors.monthlyGoalsBg);
    sheet.getRange(S.monthlyGoals.headerRow, 1)
        .setValue(S.monthlyGoals.label)
        .setFontWeight("bold")
        .setFontSize(11);

    for (let i = 0; i < S.monthlyGoals.defaultCount; i++) {
        const row = S.monthlyGoals.startRow + i;
        sheet.getRange(row, 1).setValue("Monthly Goal " + (i + 1));
        sheet.getRange(row, 1 + daysInMonth).insertCheckboxes().setBackground("#fff2cc");
    }

    // MORNING SECTION
    setMetricHeader(sheet, S.morning.headerRow, S.morning.label, daysInMonth);
    setMetricRow(sheet, S.morning.startRow, S.morning.metrics[0], "time", daysInMonth);

    // FOCUS SECTION
    setMetricHeader(sheet, S.focus.headerRow, S.focus.label, daysInMonth);
    setMetricRow(sheet, S.focus.startRow, S.focus.metrics[0], "decimal", daysInMonth);

    // GYM SECTION
    setMetricHeader(sheet, S.gym.headerRow, S.gym.label, daysInMonth);
    setMetricRow(sheet, S.gym.startRow, S.gym.metrics[0], "number", daysInMonth);
    setMetricRow(sheet, S.gym.startRow + 1, S.gym.metrics[1], "number", daysInMonth);
    setMetricRow(sheet, S.gym.startRow + 2, S.gym.metrics[2], "number", daysInMonth);

    // WEEKEND HIGHLIGHTING
    for (let d = 1; d <= daysInMonth; d++) {
        let date = new Date(CONFIG.YEAR, monthIndex, d);
        if (date.getDay() === 0 || date.getDay() === 6) {
            sheet.getRange(1, d + 1, 30, 1).setBackground(CONFIG.colors.weekend);
        }
    }

    // TODAY HIGHLIGHTER
    const dayRange = sheet.getRange(1, 2, 30, daysInMonth);
    const todayRule = SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(`=AND(DAY(TODAY())=B$1, MONTH(TODAY())=${monthIndex + 1}, YEAR(TODAY())=${CONFIG.YEAR})`)
        .setBackground(CONFIG.colors.today)
        .setRanges([dayRange])
        .build();

    sheet.setConditionalFormatRules([todayRule]);

    // CHARTS
    createDailyCharts(sheet, monthName, monthIndex, daysInMonth);
}

/**
 * 📊 CREATE DAILY CHARTS - FIXED
 */
function createDailyCharts(sheet, monthName, monthIndex, daysInMonth) {
    const S = CONFIG.sections;

    // CHART 1: Daily Goals Completion %
    // Build array of completion formulas for each day
    const completionRow = 50;
    for (let d = 1; d <= daysInMonth; d++) {
        const col = columnToLetter(d + 1);
        const range = `${col}${S.dailyGoals.startRow}:${col}${S.dailyGoals.startRow + S.dailyGoals.defaultCount - 1}`;
        const formula = `=IFERROR(COUNTIF(${range},TRUE)/${S.dailyGoals.defaultCount}*100,0)`;
        sheet.getRange(completionRow, d + 1).setFormula(formula);
    }
    sheet.hideRows(completionRow, 1);

    const completionChart = sheet.newChart()
        .setChartType(Charts.ChartType.AREA)
        .addRange(sheet.getRange(1, 2, 1, daysInMonth)) // X-axis: days
        .addRange(sheet.getRange(completionRow, 2, 1, daysInMonth)) // Y-axis: completion %
        .setPosition(27, 2, 0, 0)
        .setOption('title', 'Daily Goals Completion (%)')
        .setOption('titleTextStyle', { fontSize: 13, bold: true })
        .setOption('legend', { position: 'none' })
        .setOption('colors', [CONFIG.colors.chartGreen])
        .setOption('width', 480)
        .setOption('height', 240)
        .setOption('hAxis', {
            title: 'Day',
            textStyle: { fontSize: 9 }
        })
        .setOption('vAxis', {
            title: '%',
            minValue: 0,
            maxValue: 100,
            format: '#\'%\''
        })
        .setOption('chartArea', { left: 50, top: 40, width: '85%', height: '65%' })
        .setOption('areaOpacity', 0.3)
        .build();
    sheet.insertChart(completionChart);

    // CHART 2: Study Hours
    const studyChart = sheet.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(sheet.getRange(1, 2, 1, daysInMonth))
        .addRange(sheet.getRange(S.focus.startRow, 2, 1, daysInMonth))
        .setPosition(27, 25, 0, 0)
        .setOption('title', 'Daily Study Hours')
        .setOption('titleTextStyle', { fontSize: 13, bold: true })
        .setOption('legend', { position: 'none' })
        .setOption('colors', [CONFIG.colors.chartBlue])
        .setOption('width', 480)
        .setOption('height', 240)
        .setOption('hAxis', {
            title: 'Day',
            textStyle: { fontSize: 9 }
        })
        .setOption('vAxis', {
            title: 'Hours',
            minValue: 0
        })
        .setOption('chartArea', { left: 50, top: 40, width: '85%', height: '65%' })
        .setOption('bar', { groupWidth: '70%' })
        .build();
    sheet.insertChart(studyChart);

    // CHART 3: Gym Progress
    const gymChart = sheet.newChart()
        .setChartType(Charts.ChartType.LINE)
        .addRange(sheet.getRange(1, 2, 1, daysInMonth))
        .addRange(sheet.getRange(S.gym.startRow, 2, 3, daysInMonth))
        .setPosition(27, 48, 0, 0)
        .setOption('title', 'Gym Progress (Daily Max)')
        .setOption('titleTextStyle', { fontSize: 13, bold: true })
        .setOption('series', {
            0: { labelInLegend: 'Bench', color: CONFIG.colors.chartRed },
            1: { labelInLegend: 'Squat', color: CONFIG.colors.chartYellow },
            2: { labelInLegend: 'Deadlift', color: CONFIG.colors.chartGreen }
        })
        .setOption('curveType', 'function')
        .setOption('width', 480)
        .setOption('height', 240)
        .setOption('hAxis', {
            title: 'Day',
            textStyle: { fontSize: 9 }
        })
        .setOption('vAxis', {
            title: 'Weight',
            minValue: 0
        })
        .setOption('chartArea', { left: 50, top: 40, width: '80%', height: '65%' })
        .build();
    sheet.insertChart(gymChart);
}

/**
 * 📊 DASHBOARD
 */
function createLiveDashboard(ss) {
    if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheetName = "📊 Dashboard";
    let dash = ss.getSheetByName(sheetName);

    if (dash) {
        const charts = dash.getCharts();
        charts.forEach(c => dash.removeChart(c));
        dash.clear();
    } else {
        dash = ss.insertSheet(sheetName, 0);
    }

    if (dash.getMaxColumns() < 80) {
        dash.insertColumnsAfter(dash.getMaxColumns(), 80 - dash.getMaxColumns());
    }

    dash.setHiddenGridlines(true);

    dash.getRange("B2").setValue("2026 DASHBOARD")
        .setFontSize(26)
        .setFontWeight("bold")
        .setFontFamily("Arial");

    dash.getRange("B4").setValue("🔴 MONTHLY GOALS PROGRESS")
        .setFontSize(14)
        .setFontWeight("bold")
        .setFontColor("#5f6368");

    createMonthlyHeatmap(ss, dash);

    dash.getRange("B9").setValue("🟢 DAILY CONSISTENCY HEATMAP")
        .setFontSize(14)
        .setFontWeight("bold")
        .setFontColor("#5f6368");

    createDailyHeatmap(ss, dash);

    dash.getRange("B20").setValue("📈 YEARLY PROGRESS (DAILY DATA)")
        .setFontSize(16)
        .setFontWeight("bold")
        .setFontColor("#202124");

    createYearlyDailyCharts(ss, dash);
}

/**
 * 🔴 MONTHLY HEATMAP - FIXED FORMULA
 */
function createMonthlyHeatmap(ss, dash) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const S = CONFIG.sections;
    const startRow = 5;
    const startCol = 2;

    // Hidden row for calculations
    const calcRow = 55;

    for (let i = 0; i < 12; i++) {
        const mName = months[i];
        const mSheet = ss.getSheetByName(mName);
        const col = startCol + (i * 3);

        dash.getRange(startRow, col).setValue(mName)
            .setFontWeight("bold")
            .setHorizontalAlignment("center")
            .setFontSize(10);

        if (mSheet) {
            const lastDay = new Date(CONFIG.YEAR, i + 1, 0).getDate();
            const colLet = columnToLetter(lastDay + 1);

            // FIXED: Calculate in hidden row, then reference it
            const rangeStr = `'${mName}'!${colLet}${S.monthlyGoals.startRow}:${colLet}${S.monthlyGoals.startRow + S.monthlyGoals.defaultCount - 1}`;
            const formula = `=IFERROR(COUNTIF(${rangeStr},TRUE)/${S.monthlyGoals.defaultCount},0)`;
            dash.getRange(calcRow, col).setFormula(formula);

            // Big box references the hidden calculation
            const box = dash.getRange(startRow + 1, col, 2, 2);
            box.setFormula(`=${columnToLetter(col)}${calcRow}`);
            box.setFontColor("transparent");
            box.setBorder(true, true, true, true, null, null, "white", SpreadsheetApp.BorderStyle.SOLID_THICK);
            box.merge();

            // Percentage display
            dash.getRange(startRow + 3, col)
                .setFormula(`=TEXT(${columnToLetter(col)}${calcRow},"0%")`)
                .setHorizontalAlignment("center")
                .setFontSize(11)
                .setFontWeight("bold");
        } else {
            dash.getRange(startRow + 1, col, 2, 2)
                .setValue("-")
                .setBackground(CONFIG.colors.lightGray)
                .setHorizontalAlignment("center")
                .merge();
        }
    }

    dash.hideRows(calcRow, 1);

    // Set dimensions
    for (let i = 0; i < 12; i++) {
        const col = startCol + (i * 3);
        dash.setColumnWidth(col, 50);
        dash.setColumnWidth(col + 1, 50);
    }
    dash.setRowHeight(startRow + 1, 50);
    dash.setRowHeight(startRow + 2, 50);

    // RED gradient
    const boxRange = dash.getRange(startRow + 1, startCol, 2, 36);
    const redScale = SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpoint("#ffebee")
        .setGradientMidpointWithValue("#ef5350", SpreadsheetApp.InterpolationType.PERCENT, 50)
        .setGradientMaxpoint("#b71c1c")
        .setRanges([boxRange])
        .build();

    dash.setConditionalFormatRules([redScale]);
}

/**
 * 🟢 DAILY HEATMAP
 */
function createDailyHeatmap(ss, dash) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const S = CONFIG.sections;
    const startRow = 10;
    const startCol = 2;

    let formulas = [];
    for (let r = 0; r < 7; r++) formulas.push(new Array(53).fill(""));

    let d = new Date(CONFIG.YEAR, 0, 1);
    const endDate = new Date(CONFIG.YEAR, 11, 31);
    let currentWeek = 0;

    while (d <= endDate) {
        const monthName = months[d.getMonth()];
        const dayNum = d.getDate();
        const dayOfWeek = d.getDay();

        const mSheet = ss.getSheetByName(monthName);
        let cellFormula = "0";

        if (mSheet) {
            const colLetter = columnToLetter(dayNum + 1);
            const dailyRange = `'${monthName}'!${colLetter}${S.dailyGoals.startRow}:${colLetter}${S.dailyGoals.startRow + S.dailyGoals.defaultCount - 1}`;
            cellFormula = `=IFERROR(COUNTIF(${dailyRange},TRUE)/${S.dailyGoals.defaultCount},0)`;
        }

        if (currentWeek < 53) {
            formulas[dayOfWeek][currentWeek] = cellFormula;
        }

        if (dayOfWeek === 6) currentWeek++;
        d.setDate(d.getDate() + 1);
    }

    const gridRange = dash.getRange(startRow, startCol, 7, 53);
    gridRange.setFormulas(formulas);
    gridRange.setBorder(true, true, true, true, true, true, "#ffffff", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    gridRange.setFontColor("transparent");

    const greenScale = SpreadsheetApp.newConditionalFormatRule()
        .setGradientMinpoint("#ebedf0")
        .setGradientMidpointWithValue("#9be9a8", SpreadsheetApp.InterpolationType.PERCENT, 50)
        .setGradientMaxpoint("#216e39")
        .setRanges([gridRange])
        .build();

    const existingRules = dash.getConditionalFormatRules();
    existingRules.push(greenScale);
    dash.setConditionalFormatRules(existingRules);

    for (let c = 0; c < 53; c++) dash.setColumnWidth(startCol + c, 16);
    for (let r = 0; r < 7; r++) dash.setRowHeight(startRow + r, 16);
}

/**
 * 📈 YEARLY DAILY CHARTS - FIXED
 */
function createYearlyDailyCharts(ss, dash) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const S = CONFIG.sections;

    let allDates = [];
    let colIndex = 2;
    const hiddenRow = 60;

    // Build data for all 365 days
    for (let m = 0; m < 12; m++) {
        const mName = months[m];
        const daysInMonth = new Date(CONFIG.YEAR, m + 1, 0).getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            allDates.push(new Date(CONFIG.YEAR, m, d));
            const col = columnToLetter(d + 1);

            // Row 60: dates
            // Row 61: study hours
            // Row 62: bench
            // Row 63: squat
            // Row 64: deadlift
            // Row 65: completion %

            dash.getRange(hiddenRow + 1, colIndex).setFormula(`=IFERROR('${mName}'!${col}${S.focus.startRow},0)`);
            dash.getRange(hiddenRow + 2, colIndex).setFormula(`=IFERROR('${mName}'!${col}${S.gym.startRow},0)`);
            dash.getRange(hiddenRow + 3, colIndex).setFormula(`=IFERROR('${mName}'!${col}${S.gym.startRow + 1},0)`);
            dash.getRange(hiddenRow + 4, colIndex).setFormula(`=IFERROR('${mName}'!${col}${S.gym.startRow + 2},0)`);

            const dailyRange = `'${mName}'!${col}${S.dailyGoals.startRow}:${col}${S.dailyGoals.startRow + S.dailyGoals.defaultCount - 1}`;
            dash.getRange(hiddenRow + 5, colIndex).setFormula(`=IFERROR(COUNTIF(${dailyRange},TRUE)/${S.dailyGoals.defaultCount}*100,0)`);

            colIndex++;
        }
    }

    // Write dates
    dash.getRange(hiddenRow, 2, 1, allDates.length).setValues([allDates]).setNumberFormat("MM/dd");
    dash.hideRows(hiddenRow, 6);

    SpreadsheetApp.flush();

    const totalDays = allDates.length;

    // CHART 1: Daily Completion Trend
    const completionChart = dash.newChart()
        .setChartType(Charts.ChartType.LINE)
        .addRange(dash.getRange(hiddenRow, 2, 1, totalDays))
        .addRange(dash.getRange(hiddenRow + 5, 2, 1, totalDays))
        .setPosition(22, 2, 0, 0)
        .setOption('title', 'Daily Goals Completion Trend (Entire Year)')
        .setOption('titleTextStyle', { fontSize: 14, bold: true })
        .setOption('legend', { position: 'none' })
        .setOption('colors', [CONFIG.colors.chartGreen])
        .setOption('width', 900)
        .setOption('height', 280)
        .setOption('hAxis', {
            textStyle: { fontSize: 8 },
            slantedText: true,
            slantedTextAngle: 45
        })
        .setOption('vAxis', {
            title: 'Completion %',
            minValue: 0,
            maxValue: 100,
            format: '#\'%\''
        })
        .setOption('chartArea', { left: 60, top: 40, width: '90%', height: '70%' })
        .build();
    dash.insertChart(completionChart);

    // CHART 2: Study Hours
    const studyChart = dash.newChart()
        .setChartType(Charts.ChartType.COLUMN)
        .addRange(dash.getRange(hiddenRow, 2, 1, totalDays))
        .addRange(dash.getRange(hiddenRow + 1, 2, 1, totalDays))
        .setPosition(38, 2, 0, 0)
        .setOption('title', 'Daily Study Hours (Entire Year)')
        .setOption('titleTextStyle', { fontSize: 14, bold: true })
        .setOption('legend', { position: 'none' })
        .setOption('colors', [CONFIG.colors.chartBlue])
        .setOption('width', 900)
        .setOption('height', 280)
        .setOption('hAxis', {
            textStyle: { fontSize: 8 },
            slantedText: true,
            slantedTextAngle: 45
        })
        .setOption('vAxis', {
            title: 'Hours',
            minValue: 0
        })
        .setOption('chartArea', { left: 60, top: 40, width: '90%', height: '70%' })
        .setOption('bar', { groupWidth: '95%' })
        .build();
    dash.insertChart(studyChart);

    // CHART 3: Gym Progress
    const gymChart = dash.newChart()
        .setChartType(Charts.ChartType.LINE)
        .addRange(dash.getRange(hiddenRow, 2, 1, totalDays))
        .addRange(dash.getRange(hiddenRow + 2, 2, 3, totalDays))
        .setPosition(54, 2, 0, 0)
        .setOption('title', 'Gym Progress - Daily Max (Entire Year)')
        .setOption('titleTextStyle', { fontSize: 14, bold: true })
        .setOption('series', {
            0: { labelInLegend: 'Bench', color: CONFIG.colors.chartRed },
            1: { labelInLegend: 'Squat', color: CONFIG.colors.chartYellow },
            2: { labelInLegend: 'Deadlift', color: CONFIG.colors.chartGreen }
        })
        .setOption('curveType', 'function')
        .setOption('width', 900)
        .setOption('height', 280)
        .setOption('hAxis', {
            textStyle: { fontSize: 8 },
            slantedText: true,
            slantedTextAngle: 45
        })
        .setOption('vAxis', {
            title: 'Weight',
            minValue: 0
        })
        .setOption('chartArea', { left: 60, top: 40, width: '85%', height: '70%' })
        .build();
    dash.insertChart(gymChart);
}

// --- HELPER FUNCTIONS ---

function setMetricHeader(sheet, row, text, width) {
    // FIXED: Background spans full width, text only in A
    sheet.getRange(row, 1, 1, width + 1)
        .setBackground(CONFIG.colors.header);
    sheet.getRange(row, 1)
        .setValue(text)
        .setFontColor(CONFIG.colors.headerText)
        .setFontWeight("bold")
        .setFontSize(11);
}

function setMetricRow(sheet, row, label, type, width) {
    sheet.getRange(row, 1).setValue(label);
    const range = sheet.getRange(row, 2, 1, width);

    if (type === "time") range.setNumberFormat("h:mm am/pm");
    if (type === "number") range.setNumberFormat("#,##0");
    if (type === "decimal") range.setNumberFormat("0.0");
}

function columnToLetter(column) {
    let temp, letter = '';
    while (column > 0) {
        temp = (column - 1) % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        column = (column - temp - 1) / 26;
    }
    return letter;
}