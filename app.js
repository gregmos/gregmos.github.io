document.addEventListener('DOMContentLoaded', function() {
  // Элементы секций
  const loginSection = document.getElementById('loginSection');
  const mainSection = document.getElementById('mainSection');
  const settingsSection = document.getElementById('settingsSection');

  // Кнопки и элементы интерфейса
  const loginBtn = document.getElementById('loginBtn');
  const signOutBtn = document.getElementById('signOutBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  const creditInfo = document.getElementById('creditInfo');
  const projectList = document.getElementById('projectList');
  const pdfFileInput = document.getElementById('pdfFileInput');
  const uploadFileBtn = document.getElementById('uploadFileBtn');
  const showNewProjectBtn = document.getElementById('showNewProjectBtn');
  const newProjectForm = document.getElementById('newProjectForm');
  const newProjectInput = document.getElementById('newProjectInput');
  const confirmNewProjectBtn = document.getElementById('confirmNewProjectBtn');
  const cancelNewProjectBtn = document.getElementById('cancelNewProjectBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const celeryProgressContainer = document.getElementById('celeryProgressContainer');
  const celeryProgressBar = document.getElementById('celeryProgressBar');
  const celeryProgressText = document.getElementById('celeryProgressText');

  let celeryIntervalId = null;

  // Простая эмуляция хранения данных (вместо chrome.storage)
  function storageGet(key) {
    const value = localStorage.getItem(key);
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  function storageSet(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Простейшая имитация аутентификации (в реальном приложении здесь нужно использовать OAuth2)
  function getAuthToken(interactive = false) {
    return new Promise((resolve, reject) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        resolve(token);
      } else if (interactive) {
        // Имитация успешного входа
        const simulatedToken = 'simulated-token';
        localStorage.setItem('authToken', simulatedToken);
        resolve(simulatedToken);
      } else {
        reject('Нет токена');
      }
    });
  }

  // Переключение экранов
  function showLoginScreen() {
    loginSection.style.display = 'block';
    mainSection.style.display = 'none';
    settingsSection.style.display = 'none';
  }
  function showMainScreen() {
    loginSection.style.display = 'none';
    mainSection.style.display = 'block';
    settingsSection.style.display = 'none';
  }
  function showSettingsScreen() {
    loginSection.style.display = 'none';
    mainSection.style.display = 'none';
    settingsSection.style.display = 'block';
  }

  // Проверка авторизации
  function checkAuth() {
    getAuthToken().then(token => {
      showMainScreen();
      loadUserCredits();
      loadProjects();
      const pendingTasks = storageGet('pendingTasks') || [];
      if (pendingTasks.length > 0) startCeleryPolling();
    }).catch(() => {
      showLoginScreen();
    });
  }

  // Пример функции склонения слова "файл"
  function pluralFile(count) {
    if (count % 10 === 1 && count % 100 !== 11) return 'файл';
    if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'файла';
    return 'файлов';
  }

  // Кнопка входа (имитация OAuth)
  loginBtn.addEventListener('click', () => {
    getAuthToken(true).then(token => {
      showMainScreen();
      loadUserCredits();
      loadProjects();
      const pendingTasks = storageGet('pendingTasks') || [];
      if (pendingTasks.length > 0) startCeleryPolling();
    }).catch(err => {
      alert('Ошибка входа: ' + err);
    });
  });

  // Выход из системы
  signOutBtn.addEventListener('click', () => {
    localStorage.removeItem('authToken');
    showLoginScreen();
  });

  // Настройки
  settingsBtn.addEventListener('click', () => {
    showSettingsScreen();
    const fields = storageGet('selectedFields') || [
      "Название суда",
      "Номер дела",
      "Дата решения",
      "Истец",
      "Ответчик",
      "Фабула дела",
      "Правовое обоснование принятия решения",
      "Краткие выводы резолютивной части",
      "Ссылки на нормы права",
      "Ссылки на судебную практику"
    ];
    document.querySelectorAll('#settingsSection input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = fields.includes(checkbox.value);
    });
  });

  saveSettingsBtn.addEventListener('click', () => {
    const selectedFields = [];
    document.querySelectorAll('#settingsSection input[type="checkbox"]').forEach((checkbox) => {
      if (checkbox.checked) {
        selectedFields.push(checkbox.value);
      }
    });
    storageSet('selectedFields', selectedFields);
    showMainScreen();
  });

  cancelSettingsBtn.addEventListener('click', () => {
    showMainScreen();
  });

  // Загрузка кредитов (пример запроса к API)
  function loadUserCredits() {
    getAuthToken().then(token => {
      fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/get_user_info', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(response => response.json())
      .then(data => {
        if (data.credits !== undefined) {
          creditInfo.innerText = "Осталось кредитов: " + data.credits;
        } else {
          creditInfo.innerText = "Ошибка получения данных";
        }
      })
      .catch(err => {
        console.error(err);
        creditInfo.innerText = "Ошибка получения данных";
      });
    }).catch(err => {
      creditInfo.innerText = "Ошибка авторизации";
    });
  }

  // Загрузка проектов с сервера
  function loadProjects() {
    getAuthToken().then(token => {
      fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/get_projects', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      .then(response => response.json())
      .then(data => {
        projectList.innerHTML = '';
        if (data.projects) {
          if (data.projects.length === 0) {
            document.getElementById('noProjectsMessage').style.display = 'block';
          } else {
            document.getElementById('noProjectsMessage').style.display = 'none';
            data.projects.forEach((project) => {
              const li = document.createElement('li');
              li.dataset.projectId = project.id;
              const nameSpan = document.createElement('span');
              nameSpan.textContent = `${project.name} (${project.processed} ${pluralFile(project.processed)})`;
              li.appendChild(nameSpan);

              const iconsContainer = document.createElement('div');
              if (project.folder_id) {
                const driveLink = document.createElement('a');
                driveLink.href = "https://drive.google.com/drive/folders/" + project.folder_id;
                driveLink.target = "_blank";
                driveLink.title = "Открыть папку в Google Drive";
                const driveIcon = document.createElement('img');
                driveIcon.src = "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png";
                driveIcon.style.width = "24px";
                driveIcon.style.height = "24px";
                driveLink.appendChild(driveIcon);
                iconsContainer.appendChild(driveLink);
              }

              const deleteBtn = document.createElement('button');
              deleteBtn.innerHTML = '🗑️';
              deleteBtn.classList.add('icon-button');
              deleteBtn.title = 'Удалить проект';
              deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm("Вы точно хотите удалить проект?")) {
                  getAuthToken().then(token => {
                    fetch(`https://cases-kad-30bc963f9461.herokuapp.com/api/delete_project/${project.id}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': 'Bearer ' + token }
                    })
                    .then(response => response.json())
                    .then(data => {
                      if (data.message === 'Project deleted successfully') {
                        loadProjects();
                      } else {
                        alert("Ошибка при удалении проекта");
                      }
                    })
                    .catch(err => {
                      console.error(err);
                      alert('Ошибка при удалении проекта: ' + err.message);
                    });
                  });
                }
              });
              iconsContainer.appendChild(deleteBtn);
              li.appendChild(iconsContainer);

              // Выбор проекта
              const defaultProjectId = storageGet('defaultProjectId');
              if (defaultProjectId === project.id) {
                li.classList.add('selected');
              }
              li.addEventListener('click', () => {
                storageSet('defaultProjectId', project.id);
                loadProjects();
              });
              projectList.appendChild(li);
            });
          }
        } else {
          projectList.innerHTML = 'Ошибка получения данных проектов';
        }
      })
      .catch(err => {
        console.error(err);
        projectList.innerHTML = 'Ошибка получения данных проектов';
      });
    });
  }

  // Функции для опроса статуса фоновых задач (имитация)
  function startCeleryPolling() {
    if (celeryIntervalId) return;
    celeryIntervalId = setInterval(pollAllTasks, 5000);
    pollAllTasks();
  }

  function pollAllTasks() {
    let tasks = storageGet('pendingTasks') || [];
    const TEN_MINUTES = 10 * 60 * 1000;
    const MAX_TIMEOUT = 15 * 60 * 1000;
    const now = Date.now();
    tasks.forEach(task => {
      if (!task.done && (now - task.added) > MAX_TIMEOUT) {
        task.done = true;
        task.error = true;
      }
    });
    tasks = tasks.filter(task => now - task.added < TEN_MINUTES);
    storageSet('pendingTasks', tasks);
    if (tasks.length === 0) {
      celeryProgressContainer.style.display = 'none';
      clearInterval(celeryIntervalId);
      celeryIntervalId = null;
      return;
    }
    let total = tasks.length, successCount = 0, failureCount = 0, requestsDone = 0;
    tasks.forEach((task) => {
      if (task.done) {
        if (task.error) failureCount++;
        else successCount++;
        requestsDone++;
        if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
      } else {
        getAuthToken().then(token => {
          fetch(`https://cases-kad-30bc963f9461.herokuapp.com/api/task_status/${task.taskId}`, {
            method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
          })
          .then(res => res.json())
          .then(info => {
            if (info.state === 'SUCCESS' || info.state === 'FAILURE') {
              task.done = true;
              if (info.state === 'FAILURE') {
                task.error = true;
                failureCount++;
              } else {
                successCount++;
              }
            }
            requestsDone++;
            if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
          })
          .catch(err => {
            console.error('Ошибка опроса', err);
            task.done = true;
            task.error = true;
            failureCount++;
            requestsDone++;
            if (requestsDone === total) updateCeleryProgress(successCount, total, tasks);
          });
        });
      }
    });
  }

  function updateCeleryProgress(doneCount, total, tasks) {
    storageSet('pendingTasks', tasks);
    const percent = Math.round((doneCount / total) * 100);
    celeryProgressBar.value = percent;
    celeryProgressText.textContent = `${doneCount}/${total}`;
    celeryProgressContainer.style.display = 'block';
    if (doneCount === total) {
      celeryProgressBar.value = 100;
      celeryProgressText.textContent = `${total}/${total}`;
      loadUserCredits();
      loadProjects();
      pdfFileInput.disabled = false;
      uploadFileBtn.disabled = false;
      pdfFileInput.value = '';
      alert('Все файлы успешно обработаны!');
      setTimeout(() => {
        storageSet('pendingTasks', []);
        celeryProgressContainer.style.display = 'none';
        clearInterval(celeryIntervalId);
        celeryIntervalId = null;
      }, 1500);
    }
  }

  function addPendingTask(taskId) {
    let tasks = storageGet('pendingTasks') || [];
    tasks.push({ taskId: taskId, done: false, added: Date.now() });
    storageSet('pendingTasks', tasks);
    startCeleryPolling();
  }

  // Форма создания проекта
  showNewProjectBtn.addEventListener('click', () => {
    newProjectForm.style.display = 'flex';
    showNewProjectBtn.style.display = 'none';
  });

  function resetProjectButtons() {
    confirmNewProjectBtn.disabled = false;
    cancelNewProjectBtn.disabled = false;
    confirmNewProjectBtn.innerHTML = '✔';
  }

  confirmNewProjectBtn.addEventListener('click', () => {
    const name = newProjectInput.value.trim();
    if (!name) return alert('Введите название проекта');
    confirmNewProjectBtn.disabled = true;
    cancelNewProjectBtn.disabled = true;
    confirmNewProjectBtn.innerHTML = '<div class="spinner"></div>Создаём...';
    getAuthToken(true).then(token => {
      fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/create_project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name: name })
      })
      .then(response => response.json())
      .then(data => {
        if (data.project_id) {
          storageSet('defaultProjectId', data.project_id);
          loadProjects();
          loadUserCredits();
          newProjectForm.style.display = 'none';
          showNewProjectBtn.style.display = 'block';
          newProjectInput.value = '';
          resetProjectButtons();
        } else {
          alert('Ошибка создания проекта');
          resetProjectButtons();
        }
      })
      .catch(err => {
        console.error(err);
        alert('Ошибка при запросе создания проекта');
        resetProjectButtons();
      });
    });
  });

  cancelNewProjectBtn.addEventListener('click', () => {
    newProjectForm.style.display = 'none';
    showNewProjectBtn.style.display = 'block';
    newProjectInput.value = '';
  });

  // Обработка выбора файлов
  pdfFileInput.addEventListener('change', () => {
    const count = pdfFileInput.files.length;
    const fileLabel = document.querySelector('label[for="pdfFileInput"]');
    if (count > 0) {
      fileLabel.textContent = `Загружено ${count} ${pluralFile(count)}`;
      uploadFileBtn.style.display = 'inline-block';
    } else {
      fileLabel.textContent = 'Выбрать файлы';
      uploadFileBtn.style.display = 'none';
    }
  });

  // Загрузка файлов
  uploadFileBtn.addEventListener('click', () => {
    const files = pdfFileInput.files;
    if (!files || files.length === 0) return alert("Выберите файлы для загрузки.");
    pdfFileInput.disabled = true;
    uploadFileBtn.disabled = true;
    const defaultProjectId = storageGet('defaultProjectId');
    if (!defaultProjectId) {
      alert("Сначала выберите или создайте проект.");
      pdfFileInput.disabled = false;
      uploadFileBtn.disabled = false;
      return;
    }
    const selectedFields = storageGet('selectedFields') || [
      "Название суда",
      "Номер дела",
      "Дата решения",
      "Истец",
      "Ответчик",
      "Фабула дела",
      "Правовое обоснование принятия решения",
      "Краткие выводы резолютивной части",
      "Ссылки на нормы права",
      "Ссылки на судебную практику"
    ];
    const totalFiles = files.length;

    function processNext(index) {
      if (index >= totalFiles) {
        alert("Все файлы поставлены в очередь на обработку.");
        loadUserCredits();
        startCeleryPolling();
        return;
      }
      const file = files[index];
      if (file.type !== "application/pdf" &&
          file.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        alert(`Файл ${file.name} не поддерживается.`);
        processNext(index + 1);
        return;
      }
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileBase64 = e.target.result.split(',')[1];
        getAuthToken(true).then(token => {
          fetch('https://cases-kad-30bc963f9461.herokuapp.com/api/add_document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({
              project_id: defaultProjectId,
              file: fileBase64,
              file_name: file.name,
              selected_fields: selectedFields
            })
          })
          .then(response => response.json())
          .then(data => {
            if (data.task_ids && Array.isArray(data.task_ids)) {
              data.task_ids.forEach(taskId => addPendingTask(taskId));
            } else if (data.task_id) {
              addPendingTask(data.task_id);
            }
            processNext(index + 1);
          })
          .catch(err => {
            console.error(err);
            alert('Ошибка при загрузке файла ' + file.name);
            processNext(index + 1);
          });
        });
      };
      reader.readAsDataURL(file);
    }
    processNext(0);
  });

  checkAuth();
});
