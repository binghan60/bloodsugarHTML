﻿const apipath = 'http://localhost:3000';
const today = new Date();
const animalId = '674d5126c36e4fd631d342c6';

const currentDate = {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
    dayInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
};
const spaceDay = () => {
    const firstDay = new Date(currentDate.year, currentDate.month, 1).getDay(); // 第一天星期幾
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // 調整成周一第一天
    return adjustedFirstDay;
};

document.addEventListener('DOMContentLoaded', async () => {
    const animalProfile = await getAnimalProfile();
    document.querySelector('#profileCard').innerHTML = `
		<li>姓名：${animalProfile.name}</li>
		<li>種類：<i class="fa-solid fa-${animalProfile.type}"></i></li>
		<li>生日：${new Date(animalProfile.birthday).toLocaleString().slice(0, 8)}</li>
		<li>性別：${animalProfile.gender == 'Male' ? `<i class="fa-solid fa-mars text-blue-600"></i>` : `<i class="fa-solid fa-venus"></i>`}</li>
		<li>血型：${animalProfile.bloodType} 型</li>
		<li>體重：${animalProfile.weight}公斤</li>
		<li>品種：${animalProfile.variety}</li>
		<li>結紮：${animalProfile.ligation ? `<i class="fa-solid fa-check"></i>` : `<i class="fa-solid fa-x"></i>`}</li>`;
    const weight = await getAnimalWeight();
    const datesArray = weight.map((item) => {
        const date = new Date(item.date);
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    });
    const weightArray = weight.map((x) => x.weight);
    const maxWeight = Math.max(...weightArray);
    const ctx = document.querySelector('#weightChart');
    const myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: datesArray,
            datasets: [
                {
                    label: '體重',
                    data: weightArray,
                    borderColor: 'rgb(147, 197, 253)',
                    backgroundColor: 'rgba(147, 197, 253, 0.6)',
                    tension: 0,
                    pointRadius: 8,
                    pointHoverRadius: 15,
                },
            ],
        },
        plugins: [ChartDataLabels],
        options: {
            responsive: true,
            // maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false,
                    position: 'top',
                },
                datalabels: {
                    display: true,
                    color: '#0080FF',
                    font: {
                        weight: 'bold',
                        size: 16,
                    },
                    align: 'top',
                    formatter: (value) => value.toFixed(1),
                },
            },
            scales: {
                y: {
                    title: {
                        display: true,
                        text: '體重(公斤)',
                    },
                    beginAtZero: false,
                    max: maxWeight * 1.01,
                },
            },
        },
    });
    await renderCalendar();
});

async function calendarCells() {
    const diaryData = await getDiaryData(); // 获取日记数据
    // 构建 days 数据，包含所有日期的默认值
    const days = Array.from({ length: currentDate.dayInMonth }, (_, i) => {
        const formattedDate = `${currentDate.year}-${String(currentDate.month + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
        const isoDate = new Date(formattedDate).toISOString();
        return {
            year: currentDate.year,
            month: currentDate.month + 1,
            date: i + 1,
            isoDate,
            morning: { bloodSugar: '', insulin: '' },
            evening: { bloodSugar: '', insulin: '' },
        };
    });
    console.log('days before merge:', days);
    // 合并日记数据到 days
    const mergedDays = days.map((day) => {
        const diaryEntry = diaryData.find((entry) => new Date(entry.date).toISOString().split('T')[0] === day.isoDate.split('T')[0]);
        if (diaryEntry) {
            return Object.assign({}, day, {
                morning: {
                    bloodSugar: diaryEntry.morning.bloodSugar || '',
                    insulin: diaryEntry.morning.insulin || '',
                },
                evening: {
                    bloodSugar: diaryEntry.evening.bloodSugar || '',
                    insulin: diaryEntry.evening.insulin || '',
                },
            });
        }
        return day; // 如果没有匹配的日记数据，则返回默认数据
    });
    console.log('mergedDays:', mergedDays);
    const blankDays = Array.from({ length: spaceDay() }, () => ({ date: null }));
    const allDays = [...blankDays, ...mergedDays];
    const totalCells = 42;
    while (allDays.length < totalCells) {
        allDays.push({ date: null });
    }
    return allDays;
}

async function renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const currentMonthDisplay = document.getElementById('currentMonth');
    currentMonthDisplay.textContent = `${currentDate.year} 年 ${currentDate.month + 1} 月`;
    calendarGrid.innerHTML = '';
    const cells = await calendarCells();
    cells.forEach((cell) => {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add(
            'bg-blue-100',
            'text-blue-900',
            'rounded-md',
            'p-2',
            'hover:bg-blue-200',
            'cursor-pointer',
            'm-1' //
        );
        if (today.getFullYear() === cell.year && today.getMonth() + 1 + 1 === cell.month && today.getDate() === cell.date) {
            cellDiv.classList.remove('bg-blue-100');
            cellDiv.classList.add('bg-sky-300');
        }
        if (cell.date) {
            cellDiv.innerHTML = `
				<div class="font-bold text-xl text-center">${cell.date}</div>
				<!-- 早上 -->
				<div class="bg-orange-100 p-2 rounded-md mb-2 hover:bg-orange-200">
					<div class="font-semibold text-orange-500 text-center"><i class="fa-regular fa-sun"></i></div>
					<div data-type="morningBloodSugar" class="editable p-1 text-sm mt-1 bg-white border border-gray-300 rounded w-full"><i class="fa-solid fa-droplet w-[14px]"></i> : ${
                        cell.morning.bloodSugar
                            ? `<span class="${(function () {
                                  if (cell.morning.bloodSugar > 400) {
                                      return 'text-red-500';
                                  }
                                  if (cell.morning.bloodSugar > 250) {
                                      return 'text-amber-500';
                                  }
                                  return 'text-green-500';
                              })()}">${cell.morning.bloodSugar}</span>` + ' mg/dl'
                            : '--'
                    }</div>
					<div data-type="morningInsulin" class="editable p-1 text-sm mt-1 bg-white border border-gray-300 rounded w-full"><i class="fa-solid fa-syringe"></i> : ${cell.morning.insulin ? cell.morning.insulin + '小格' : '--'}</div>
				</div>
				<!-- 晚上 -->
				<div class="bg-purple-100 p-2 rounded-md hover:bg-purple-200">
					<div class="font-semibold text-purple-500 text-center"><i class="fa-regular fa-moon"></i></div>
					<div data-type="eveningBloodSugar" class="editable p-1 text-sm mt-1 bg-white border border-gray-300 rounded w-full"><i class="fa-solid fa-droplet w-[14px]"></i> : ${
                        cell.evening.bloodSugar
                            ? `<span class="${(function () {
                                  if (cell.evening.bloodSugar > 400) {
                                      return 'text-red-600';
                                  }
                                  if (cell.evening.bloodSugar > 250) {
                                      return 'text-amber-500';
                                  }
                                  return 'text-green-500';
                              })()}">${cell.evening.bloodSugar}</span>` + ' mg/dl'
                            : '--'
                    }</div>
					<div data-type="eveningInsulin" class="editable p-1 text-sm mt-1 bg-white border border-gray-300 rounded w-full"><i class="fa-solid fa-syringe"></i> : ${cell.evening.insulin ? cell.evening.insulin + '小格' : '--'}</div>
				</div>`;
            calendarGrid.appendChild(cellDiv);
            cellDiv.addEventListener('click', (e) => {
                const target = e.target;
                const date = new Date(`${cell.year}-${cell.month}-${cell.date}`);
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}`;
                if (target.classList.contains('editable')) {
                    const currentValue = target.textContent
                        .replace(/^(<i class="fa-solid fa-droplet"><\/i>)| : --/, '')
                        .replace(/[^0-9.]+/, '')
                        .replace('小格', '');
                    if (target.dataset.type.includes('Insulin')) {
                        const select = document.createElement('select');
                        const options = ['0', '0.5', '1', '1.5', '2'];
                        options.forEach((value) => {
                            const option = document.createElement('option');
                            option.value = value;
                            option.textContent = value + '小格';
                            if (value === currentValue) {
                                option.selected = true;
                            }
                            select.appendChild(option);
                        });
                        select.className = 'p-1 mt-1 border border-blue-500 rounded text-sm w-full';
                        target.replaceWith(select);
                        select.focus();
                        select.addEventListener('blur', async () => {
                            //胰島素
                            target.innerHTML = `<i class="fa-solid fa-syringe"></i>: ${select.value != '請選擇' ? select.value + '小格' : '--'}`;
                            select.replaceWith(target);
                            if (target.dataset.type.includes('morning')) {
                                await createDiaryData(formattedDate, '', select.value, '', '', '');
                            }
                            if (target.dataset.type.includes('evening')) {
                                await createDiaryData(formattedDate, '', '', '', select.value, '');
                            }
                        });
                    } else {
                        // 血糖input
                        const input = document.createElement('input');
                        input.type = 'number';
                        input.value = currentValue.replace(' mg/dl', '') === '--' ? '' : currentValue.replace(' mg/dl', '');
                        console.log(currentValue);
                        input.className = 'p-1 mt-1 border border-blue-500 rounded text-sm w-full';
                        target.replaceWith(input);
                        input.focus();
                        input.addEventListener('blur', async () => {
                            input.replaceWith(target);
                            if (target.dataset.type.includes('morning')) {
                                const insertBloodSugarResponse = await createDiaryData(formattedDate, input.value, '', '', '', '');
                                target.innerHTML = `<i class="fa-solid fa-droplet"></i> : ${
                                    insertBloodSugarResponse.morning.bloodSugar
                                        ? `<span class="${(function () {
                                              if (insertBloodSugarResponse.morning.bloodSugar > 400) {
                                                  return 'text-red-600';
                                              }
                                              if (insertBloodSugarResponse.morning.bloodSugar > 250) {
                                                  return 'text-amber-500';
                                              }
                                              return 'text-green-500';
                                          })()}">${insertBloodSugarResponse.morning.bloodSugar}</span>` + ' mg/dl'
                                        : '--'
                                }`;
                            }
                            if (target.dataset.type.includes('evening')) {
                                const insertBloodSugarResponse = await createDiaryData(formattedDate, '', '', input.value, '', '');
                                target.innerHTML = `<i class="fa-solid fa-droplet"></i> : ${
                                    insertBloodSugarResponse.evening.bloodSugar
                                        ? `<span class="${(function () {
                                              if (insertBloodSugarResponse.evening.bloodSugar > 400) {
                                                  return 'text-red-600';
                                              }
                                              if (insertBloodSugarResponse.evening.bloodSugar > 250) {
                                                  return 'text-amber-500';
                                              }
                                              return 'text-green-500';
                                          })()}">${insertBloodSugarResponse.evening.bloodSugar}</span>` + ' mg/dl'
                                        : '--'
                                }`;
                            }
                        });
                    }
                }
            });
        } else {
            // 空白格子
            cellDiv.classList.add('bg-transparent', 'cursor-default', 'pointer-events-none');
            calendarGrid.appendChild(cellDiv);
        }
    });
    await createCurrentMonthSugarCurve();
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.month -= 1;
    if (currentDate.month < 0) {
        currentDate.month = 11;
        currentDate.year -= 1;
    }
    currentDate.dayInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate();
    renderCalendar();
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.month += 1;
    if (currentDate.month > 11) {
        currentDate.month = 0;
        currentDate.year += 1;
    }
    currentDate.dayInMonth = new Date(currentDate.year, currentDate.month + 1, 0).getDate();
    renderCalendar();
});

document.getElementById('add-field-btn').addEventListener('click', () => {
    const container = document.getElementById('input-container');
    const newFieldGroup = document.createElement('div');
    newFieldGroup.classList.add('grid', 'grid-cols-[2fr_2fr_0.5fr]', 'gap-4', 'items-center', 'border', 'p-2', 'rounded-md', 'shadow-md');
    newFieldGroup.innerHTML = `
        <input type="time" name="sugarCurveTime" class="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <input type="number" name="sugarCurveBloodSugar" placeholder="輸入血糖值" class="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        <button class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-md">X</button>
    `;
    container.appendChild(newFieldGroup);
    newFieldGroup.querySelector('button').addEventListener('click', () => {
        newFieldGroup.remove();
    });
});

async function submitSugarCurve(date) {
    let timeArray = [];
    let sugarArray = [];
    document.querySelectorAll('input[name=sugarCurveTime]').forEach((x) => {
        timeArray.push(x.value);
    });
    document.querySelectorAll('input[name=sugarCurveBloodSugar]').forEach((x) => {
        sugarArray.push(x.value);
    });
    if (timeArray.includes('') || sugarArray.includes('')) {
        alert('請輸入完整資訊');
        return;
    }
    let records = timeArray.map((time, index) => ({
        time: time,
        value: sugarArray[index],
    }));

    console.log({ records });
    const createSugarCurveResponse = await createSugarCurve(date, records);
    console.log(createSugarCurveResponse);
    if (!createSugarCurveResponse._id) {
        alert('新增失敗');
    }
    await createCurrentMonthSugarCurve();
    document.querySelector('#fade').style.display = 'none';
    document.querySelector('#input-container').innerHTML = `
        <div class="grid grid-cols-[2fr_2fr_0.5fr] gap-4 items-center border p-2 rounded-md shadow-md">
            <input type="time" name="sugarCurveTime" class="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <input type="number" name="sugarCurveBloodSugar" placeholder="輸入血糖值" class="block w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            <button class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-2 rounded-md">X</button>
        </div>`;
}

function openCreateSugarCurveWindow() {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;
    document.querySelector('#sugarCurveYear').value = year;
    document.querySelector('#sugarCurveMonth').value = month;
    document.querySelector('#sugarCurveDay').value = day;
    document.querySelector('#sugarCurveBtn').innerHTML = `
        <button class="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-6 rounded-lg shadow-md w-1/3 transition-all" onclick="document.querySelector('#fade').style.display='none'">取消</button>
        <button class="bg-blue-500 hover:bg-blue-400 text-white py-2 px-6 rounded-lg shadow-md w-1/3 transition-all" onclick="submitSugarCurve('${formattedDate}')">確定</button>`;

    document.querySelector('#fade').style.display = 'flex';
}
async function createCurrentMonthSugarCurve() {
    const sugarCurve = await getBloodSugarCurve();
    document.querySelector('#monthChart').innerHTML = '';
    sugarCurve.forEach((data, index) => {
        const canvas = document.createElement('canvas');
        canvas.id = `sugarCurvechart-${index}`; // 设置唯一ID
        canvas.width = '100%';
        canvas.height = '100%';
        const div = document.createElement('div');
        div.classList.add('rounded-lg', 'overflow-hidden', 'shadow-lg', 'bg-white', 'mt-6', 'p-4', 'h-[350px]');
        document.querySelector('#monthChart').appendChild(div);
        div.append(canvas);
        const timeArray = data.records.map((x) => x.time);
        const sugarArray = data.records.map((x) => x.value * 1);
        const chartDate = new Date(data.date).toLocaleString().slice(0, 10);
        console.log(chartDate);
        new Chart(canvas, {
            type: 'line',
            data: {
                labels: timeArray,
                datasets: [
                    {
                        label: '血糖',
                        data: sugarArray,
                        borderColor: '#D2E9FF',
                        backgroundColor: '#D2E9FF',
                        tension: 0,
                        pointRadius: 8,
                        pointHoverRadius: 15,
                    },
                ],
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `${chartDate}血糖曲線`,
                    },
                    legend: {
                        display: false,
                        position: 'top',
                    },
                    datalabels: {
                        display: true,
                        color: '#0080FF',
                        font: {
                            weight: 'bold',
                            size: 16,
                        },
                        align: 'top',
                        formatter: (value) => value.toFixed(1),
                    },
                },
                scales: {
                    y: {
                        title: {
                            display: true,
                            text: '體重',
                        },
                        beginAtZero: false,
                        max: Math.max(...sugarArray) * 1.1,
                    },
                },
            },
        });
    });
}

async function getAnimalProfile() {
    try {
        const response = await fetch(`${apipath}/animal/${animalId}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('getAnimalProfile', error);
        throw error;
    }
}
async function getAnimalWeight() {
    try {
        const response = await fetch(`${apipath}/weight/${animalId}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('getAnimalWeight', error);
        throw error;
    }
}
async function getDiaryData() {
    try {
        const response = await fetch(`${apipath}/bloodSugar/diary?id=${animalId}&year=${currentDate.year}&month=${currentDate.month + 1}&dayInMonth=${currentDate.dayInMonth}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('createDiaryData', error);
        throw error;
    }
}
async function getBloodSugarCurve() {
    try {
        const response = await fetch(`${apipath}/bloodSugar/getCurve?userId=${animalId}&year=${currentDate.year}&month=${currentDate.month + 1}`, {
            method: 'GET',
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('createDiaryData', error);
        throw error;
    }
}

async function createDiaryData(date, morningBloodSugar, morningInsulin, eveningBloodSugar, eveningInsulin, notes, isoDate) {
    try {
        const response = await fetch(`${apipath}/bloodSugar/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: animalId,
                date,
                morning: {
                    bloodSugar: morningBloodSugar,
                    insulin: morningInsulin,
                },
                evening: {
                    bloodSugar: eveningBloodSugar,
                    insulin: eveningInsulin,
                },
                notes,
                isoDate,
            }),
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('createDiaryData', error);
        throw error;
    }
}

async function createSugarCurve(date, records) {
    try {
        const response = await fetch(`${apipath}/bloodSugar/createCurve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: animalId,
                date,
                records,
            }),
        });
        if (!response.ok) {
            throw new Error(`Request failed with status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);
        return data;
    } catch (error) {
        alert('伺服器忙碌中，請稍後再試。');
        console.error('createDiaryData', error);
        throw error;
    }
}
