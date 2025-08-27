// ゲーム状態管理
class GameState {
    constructor() {
        this.currentScreen = 'title';
        this.gameData = {};
        this.audioContext = null;
        this.sounds = {};
        this.config = {
            volumeMaster: 0.7,
            volumeBGM: 0.6,
            volumeSE: 0.7
        };
        
        // ゲーム進行状態
        this.relaxGauge = 0;
        this.combo = 0;
        this.lastClick = 0;
        this.balance = {
            shoulder: 0,
            neck: 0,
            back: 0,
            waist: 0,
            thigh: 0,
            calf: 0,
            foot: 0
        };
        this.skillCooldowns = {};
        this.currentDialog = { scene: '', index: 0 };
        
        this.init();
    }

    async init() {
        console.log('Initializing game...');
        await this.loadCSVData();
        console.log('CSV data loaded, setting up event listeners...');
        this.setupEventListeners();
        console.log('Event listeners set up, showing title screen...');
        this.showScreen('title');
        console.log('Game initialization complete!');
    }

    async loadCSVData() {
        const csvFiles = [
            'scenes', 'characters', 'dialogues', 'character_levels',
            'endings', 'ui_elements', 'ui_panels', 'ui_icons',
            'click_areas', 'ui_animations', 'ui_fonts', 'ui_responsive',
            'game_balance', 'sound_effects', 'massage_parts', 'skills'
        ];

        for (const file of csvFiles) {
            try {
                const data = await this.loadCSV(`${file}.csv`);
                this.gameData[file] = data;
            } catch (error) {
                console.error(`Failed to load ${file}.csv:`, error);
                this.gameData[file] = [];
            }
        }
        
        console.log('CSV data loaded:', this.gameData);
    }

    async loadCSV(filename) {
        try {
            const text = await window.native.readText(`data/csv/${filename}`);
            const lines = text.split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length < 2) return [];
            
            const headers = this.parseCSVLine(lines[0]);
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = this.parseCSVLine(lines[i]);
                if (values.length === headers.length) {
                    const row = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index];
                    });
                    data.push(row);
                }
            }
            
            return data;
        } catch (error) {
            console.error(`Error loading CSV ${filename}:`, error);
            return [];
        }
    }

    parseCSVLine(line) {
        // より簡単で確実なCSVパーサー
        const result = [];
        let current = '';
        let inQuotes = false;
        let i = 0;
        
        while (i < line.length) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    // エスケープされたクォート
                    current += '"';
                    i += 2;
                } else {
                    // クォートの開始/終了
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === ',' && !inQuotes) {
                // フィールドの区切り
                result.push(current.trim());
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }
        
        // 最後のフィールド
        result.push(current.trim());
        
        return result;
    }

    setupEventListeners() {
        // タイトルメニュー
        const btnStart = document.getElementById('btn-start');
        const btnConfig = document.getElementById('btn-config');
        const btnExit = document.getElementById('btn-exit');

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                console.log('Start button clicked!');
                this.playSound('button_click');
                this.startGame();
            });
        }

        if (btnConfig) {
            btnConfig.addEventListener('click', () => {
                console.log('Config button clicked!');
                this.playSound('button_click');
                this.showScreen('config');
            });
        }

        if (btnExit) {
            btnExit.addEventListener('click', () => {
                console.log('Exit button clicked!');
                this.playSound('button_click');
                this.exitGame();
            });
        }

        // 会話システム
        const btnNext = document.getElementById('btn-next');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                console.log('Next button clicked!');
                this.playSound('button_click');
                this.nextDialog();
            });
        }

        // メインゲーム - クリックエリア
        const clickAreas = document.querySelectorAll('.click-area');
        clickAreas.forEach(area => {
            area.addEventListener('click', (e) => {
                const part = e.currentTarget.dataset.part;
                console.log('Clicked part:', part);
                this.clickPart(part, e);
            });

            area.addEventListener('mouseenter', () => {
                this.playSound('button_hover');
            });
        });

        // スキルボタン
        const skillButtons = document.querySelectorAll('.skill-btn');
        skillButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const skill = e.currentTarget.dataset.skill;
                console.log('Used skill:', skill);
                this.useSkill(skill);
            });
        });

        // エンディングボタン
        const btnRetry = document.getElementById('btn-retry');
        const btnTitle = document.getElementById('btn-title');

        if (btnRetry) {
            btnRetry.addEventListener('click', () => {
                console.log('Retry button clicked!');
                this.playSound('button_click');
                this.resetGame();
                this.startGame();
            });
        }

        if (btnTitle) {
            btnTitle.addEventListener('click', () => {
                console.log('Title button clicked!');
                this.playSound('button_click');
                this.resetGame();
                this.showScreen('title');
            });
        }

        // 設定
        const btnConfigClose = document.getElementById('btn-config-close');
        if (btnConfigClose) {
            btnConfigClose.addEventListener('click', () => {
                console.log('Config close button clicked!');
                this.playSound('button_click');
                this.showScreen('title');
            });
        }

        // 音量調整
        const volumeMaster = document.getElementById('volume-master');
        const volumeBGM = document.getElementById('volume-bgm');
        const volumeSE = document.getElementById('volume-se');

        if (volumeMaster) {
            volumeMaster.addEventListener('input', (e) => {
                this.config.volumeMaster = e.target.value / 100;
            });
        }

        if (volumeBGM) {
            volumeBGM.addEventListener('input', (e) => {
                this.config.volumeBGM = e.target.value / 100;
            });
        }

        if (volumeSE) {
            volumeSE.addEventListener('input', (e) => {
                this.config.volumeSE = e.target.value / 100;
            });
        }
    }

    showScreen(screenName) {
        console.log(`Showing screen: ${screenName}`);
        // すべての画面を非表示
        const screens = document.querySelectorAll('.screen');
        screens.forEach(screen => screen.classList.remove('active'));

        // 指定された画面を表示
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
            
            // 背景画像を設定
            this.setBackground(screenName);
            
            // キャラクターを表示
            console.log(`Calling setCharacter for: ${screenName}`);
            this.setCharacter(screenName);
        } else {
            console.log(`Target screen not found: ${screenName}-screen`);
        }
    }

    setBackground(screenName) {
        let sceneId = screenName;
        // ゲーム画面は therapy_room シーンを使用
        if (screenName === 'game') {
            sceneId = 'therapy_room';
        }
        
        const sceneData = this.gameData.scenes?.find(s => s.scene_id === sceneId);
        if (sceneData && sceneData.bg_image) {
            const bgElement = document.getElementById(`${screenName}-bg`);
            if (bgElement) {
                bgElement.style.backgroundImage = `url('assets/${sceneData.bg_image}')`;
                bgElement.style.backgroundSize = 'cover';
                bgElement.style.backgroundPosition = 'center';
                bgElement.style.backgroundRepeat = 'no-repeat';
            }
        }
    }

    setCharacter(screenName) {
        console.log(`setCharacter called with: ${screenName}`);
        if (screenName === 'title') {
            console.log('Setting title character');
            const characterElement = document.getElementById('title-character');
            if (characterElement) {
                characterElement.style.backgroundImage = `url('assets/face/koharu_title.svg')`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'center';
                characterElement.style.backgroundRepeat = 'no-repeat';
            }
        } else if (screenName === 'dialog') {
            console.log('Setting dialog character');
            const characterElement = document.getElementById('dialog-character');
            if (characterElement) {
                characterElement.style.backgroundImage = `url('assets/pose/koharu_dialog.svg')`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'bottom center';
                characterElement.style.backgroundRepeat = 'no-repeat';
            }
        } else if (screenName === 'game') {
            console.log('Entering game character setup');
            const characterElement = document.getElementById('game-character');
            if (characterElement) {
                console.log('Setting game character image...');
                const imagePath = './assets/pose/koharu_therapy.svg';
                console.log('Image path:', imagePath);
                characterElement.style.backgroundImage = `url("${imagePath}")`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'center';
                characterElement.style.backgroundRepeat = 'no-repeat';
                console.log('Background image set:', characterElement.style.backgroundImage);
                console.log('Element computed style:', window.getComputedStyle(characterElement).backgroundImage);
            } else {
                console.log('game-character element not found!');
            }
        }
    }

    startGame() {
        this.resetGame();
        this.currentDialog = { scene: 'intro', index: 0 };
        this.showScreen('dialog');
        this.showDialog();
    }

    resetGame() {
        this.relaxGauge = 0;
        this.combo = 0;
        this.lastClick = 0;
        Object.keys(this.balance).forEach(key => this.balance[key] = 0);
        this.skillCooldowns = {};
        this.updateHUD();
    }

    showDialog() {
        console.log(`Looking for dialog: scene=${this.currentDialog.scene}, index=${this.currentDialog.index + 1}`);
        const dialogData = this.gameData.dialogues.find(d => 
            d.scene_id === this.currentDialog.scene && 
            parseInt(d.order) === this.currentDialog.index + 1
        );

        if (dialogData && this.currentDialog.index < 1) {
            // 最初の会話だけ表示
            console.log(`Found dialog:`, dialogData);
            const characterName = document.getElementById('speaker-name');
            const dialogText = document.getElementById('dialog-text');
            
            characterName.textContent = this.getCharacterName(dialogData.char_id);
            this.typewriterEffect(dialogText, dialogData.text);
        } else {
            console.log('Moving to game screen after first dialog');
            // 1回会話を見せた後、ゲーム画面へ
            this.showScreen('game');
            this.updateHUD();
        }
    }

    getCharacterName(charId) {
        const char = this.gameData.characters.find(c => c.char_id === charId);
        return char ? char.name : 'Unknown';
    }

    typewriterEffect(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;
        const timer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(timer);
            }
        }, speed);
    }

    nextDialog() {
        console.log(`nextDialog: current index=${this.currentDialog.index}, incrementing to ${this.currentDialog.index + 1}`);
        this.currentDialog.index++;
        this.showDialog();
    }

    clickPart(part, event) {
        const now = performance.now();
        const deltaTime = (now - this.lastClick) / 1000;

        // テンポ判定
        const comboWindow = this.getGameBalance('combo_window_min', 0.35);
        const comboWindowMax = this.getGameBalance('combo_window_max', 0.65);
        
        if (deltaTime >= comboWindow && deltaTime <= comboWindowMax && this.lastClick > 0) {
            this.combo++;
        } else if (this.lastClick > 0) {
            this.combo = 1;
        } else {
            this.combo = 1;
        }

        this.lastClick = now;

        // 効果計算
        const baseGain = this.getPartBaseGain(part);
        const comboMultiplier = Math.min(2.0, 1.0 + (this.combo - 1) * 0.1);
        const skillMultiplier = this.getSkillMultiplier(part);
        
        const gain = baseGain * comboMultiplier * skillMultiplier;
        
        this.balance[part] += gain;
        this.relaxGauge = Math.min(100, this.relaxGauge + gain);

        // エフェクト表示
        this.showClickEffect(event);
        this.playSound('click_soft');

        // HUD更新
        this.updateHUD();

        // ゲージMAXチェック
        if (this.relaxGauge >= 100) {
            setTimeout(() => this.endGame(), 1000);
        }
    }

    getPartBaseGain(part) {
        const partData = this.gameData.click_areas.find(p => p.part_id === part);
        return partData ? parseFloat(partData.base_gain) : 1.0;
    }

    getGameBalance(key, defaultValue) {
        const balance = this.gameData.game_balance.find(b => b.key === key);
        return balance ? parseFloat(balance.value) : defaultValue;
    }

    getSkillMultiplier(part) {
        // スキル効果の計算（簡略化）
        return 1.0;
    }

    showClickEffect(event) {
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        ripple.style.left = `${x - 100}px`;
        ripple.style.top = `${y - 100}px`;
        
        event.target.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 600);
    }

    updateHUD() {
        const gaugeElement = document.getElementById('relax-gauge');
        const percentageElement = document.getElementById('gauge-percentage');
        const comboElement = document.getElementById('combo-counter');

        if (gaugeElement) {
            gaugeElement.style.width = `${this.relaxGauge}%`;
        }

        if (percentageElement) {
            percentageElement.textContent = `${Math.round(this.relaxGauge)}%`;
        }

        if (comboElement) {
            comboElement.textContent = `コンボ: ${this.combo}`;
        }
    }

    useSkill(skillId) {
        if (this.skillCooldowns[skillId] && this.skillCooldowns[skillId] > Date.now()) {
            return;
        }

        const skillData = this.gameData.skills.find(s => s.skill_id === skillId);
        if (!skillData) return;

        this.playSound('skill_activate');
        
        // スキル効果を適用（簡略化）
        const duration = parseInt(skillData.duration) * 1000;
        this.skillCooldowns[skillId] = Date.now() + duration + 5000; // クールダウン5秒

        // スキルボタンの視覚的フィードバック
        const skillButton = document.querySelector(`[data-skill="${skillId}"]`);
        if (skillButton) {
            skillButton.style.opacity = '0.5';
            setTimeout(() => {
                skillButton.style.opacity = '1';
            }, duration + 5000);
        }
    }

    endGame() {
        const endingId = this.determineEnding();
        const endingData = this.gameData.endings.find(e => e.ending_id === endingId);
        
        if (endingData) {
            document.getElementById('ending-title').textContent = endingData.name;
            
            const endingText = this.gameData.dialogues.find(d => 
                d.scene_id === endingId.toLowerCase()
            );
            
            if (endingText) {
                document.getElementById('ending-text').textContent = endingText.text;
            }
        }

        this.playSound('ending_chime');
        this.showScreen('ending');
    }

    determineEnding() {
        const total = Object.values(this.balance).reduce((a, b) => a + b, 0) || 1;
        const percentages = {};
        
        Object.keys(this.balance).forEach(part => {
            percentages[part] = (this.balance[part] / total) * 100;
        });

        const upperBody = percentages.shoulder + percentages.neck;
        const lowerBody = percentages.waist + percentages.back + 
                          percentages.thigh + percentages.calf + percentages.foot;
        const maxPart = Math.max(...Object.values(percentages));
        const minPart = Math.min(...Object.values(percentages));

        // エンディング判定
        if (this.combo >= 60) return 'E4'; // プロ仕上げ
        if (upperBody >= 45) return 'E1'; // かるがるショルダー
        if (lowerBody >= 55) return 'E2'; // 姿勢シャン
        if (maxPart <= 35 && minPart >= 10) return 'E3'; // 全身調律
        
        return 'E3'; // デフォルト
    }

    playSound(soundId) {
        // 音響実装（簡略化）
        console.log(`Playing sound: ${soundId}`);
    }

    exitGame() {
        if (typeof window !== 'undefined' && window.close) {
            window.close();
        }
    }
}

// ゲーム初期化
let gameState;

// デバッグ用：基本的なテスト
function testBasicFunctionality() {
    console.log('Testing basic functionality...');
    console.log('Document ready state:', document.readyState);
    
    const startBtn = document.getElementById('btn-start');
    console.log('Start button found:', !!startBtn);
    
    if (startBtn) {
        console.log('Start button styles:', window.getComputedStyle(startBtn));
        console.log('Start button position:', startBtn.getBoundingClientRect());
    }
    
    // 直接クリックイベントをテスト
    if (startBtn) {
        startBtn.onclick = function() {
            console.log('Direct onclick worked!');
            // 会話画面に移動
            const titleScreen = document.getElementById('title-screen');
            const dialogScreen = document.getElementById('dialog-screen');
            if (titleScreen) titleScreen.classList.remove('active');
            if (dialogScreen) dialogScreen.classList.add('active');
            alert('ゲーム開始！会話画面に移動しました');
        };
    }
    
    // 他のボタンも直接設定
    const configBtn = document.getElementById('btn-config');
    if (configBtn) {
        configBtn.onclick = function() {
            console.log('Config button clicked!');
            const titleScreen = document.getElementById('title-screen');
            const configScreen = document.getElementById('config-screen');
            if (titleScreen) titleScreen.classList.remove('active');
            if (configScreen) configScreen.classList.add('active');
        };
    }
    
    const nextBtn = document.getElementById('btn-next');
    if (nextBtn) {
        nextBtn.onclick = function() {
            console.log('Next button clicked!');
            const dialogScreen = document.getElementById('dialog-screen');
            const gameScreen = document.getElementById('game-screen');
            if (dialogScreen) dialogScreen.classList.remove('active');
            if (gameScreen) gameScreen.classList.add('active');
            alert('メインゲーム画面に移動しました');
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded!');
    testBasicFunctionality();
    
    // ちょっと待ってからゲーム初期化
    setTimeout(() => {
        gameState = new GameState();
    }, 100);
});

// オートセーブ
setInterval(() => {
    if (gameState && gameState.currentScreen === 'game') {
        const saveData = {
            relaxGauge: gameState.relaxGauge,
            combo: gameState.combo,
            balance: gameState.balance,
            skillCooldowns: gameState.skillCooldowns,
            timestamp: Date.now()
        };
        
        localStorage.setItem('seitai_autosave', JSON.stringify(saveData));
    }
}, 5000);