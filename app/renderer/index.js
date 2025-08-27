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
        this.currentTypewriterTimer = null;
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
        this.activeSkills = {};
        this.skillsUsed = {};
        this.skillTimers = {};
        this.currentDialog = { scene: '', index: 0 };
        
        // 新しいゲームシステム用変数
        this.currentTarget = null;
        this.targetStartTime = 0;
        this.gameActive = false;
        this.targetInterval = null;
        this.maxCombo = 0;
        this.missCount = 0;
        this.selectedCharacter = null;
        
        // 音響用のAudioContextを初期化
        this.audioContext = null;
        
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
        // キャラクター選択
        this.setupCharacterSelection();
        
        // タイトルメニュー
        const btnStart = document.getElementById('btn-start');
        const btnExit = document.getElementById('btn-exit');
        
        // 初期状態でStartボタンを無効化
        if (btnStart) {
            btnStart.disabled = true;
        }

        if (btnStart) {
            btnStart.addEventListener('click', () => {
                console.log('Start button clicked!');
                this.playSound('button_click');
                this.startGame();
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

        // メインゲーム - 身体部位クリックエリア
        const bodyParts = document.querySelectorAll('.body-part');
        bodyParts.forEach(part => {
            part.addEventListener('click', (e) => {
                const partName = e.currentTarget.dataset.part;
                console.log('Clicked body part:', partName);
                this.clickBodyPart(partName, e);
            });

            part.addEventListener('mouseenter', () => {
                this.playSound('button_hover');
            });
        });

        // スキルボタン（自動発動のため無効化）
        const skillButtons = document.querySelectorAll('.skill-btn');
        skillButtons.forEach(btn => {
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            // イベントリスナーは削除（自動発動のため）
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

    setupCharacterSelection() {
        const characterCards = document.querySelectorAll('.character-card');
        const btnStart = document.getElementById('btn-start');
        
        // キャラクターポートレートを設定
        this.setCharacterPortraits();
        
        characterCards.forEach(card => {
            card.addEventListener('click', () => {
                // 既存の選択を解除
                characterCards.forEach(c => c.classList.remove('selected'));
                
                // 選択したカードをハイライト
                card.classList.add('selected');
                
                // 選択されたキャラクターを記録
                this.selectedCharacter = card.dataset.character;
                console.log('Selected character:', this.selectedCharacter);
                
                // タイトル画面のプレビューを更新
                this.setCharacter('title');
                
                // Startボタンを有効化
                if (btnStart) {
                    btnStart.disabled = false;
                }
            });
        });
    }

    setCharacterPortraits() {
        const portraits = ['koharu', 'suzu', 'michiru'];
        portraits.forEach(char => {
            const portraitElement = document.getElementById(`portrait-${char}`);
            if (portraitElement) {
                portraitElement.style.backgroundImage = `url('assets/face/${char}_title.svg')`;
                portraitElement.style.backgroundSize = 'contain';
                portraitElement.style.backgroundPosition = 'center';
                portraitElement.style.backgroundRepeat = 'no-repeat';
            }
        });
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
        const selectedChar = this.selectedCharacter || 'koharu';
        
        if (screenName === 'title') {
            console.log('Setting title character');
            const characterElement = document.getElementById('title-character');
            if (characterElement) {
                characterElement.style.backgroundImage = `url('assets/face/${selectedChar}_title.svg')`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'center';
                characterElement.style.backgroundRepeat = 'no-repeat';
            }
        } else if (screenName === 'dialog') {
            console.log('Setting dialog character');
            const characterElement = document.getElementById('dialog-character');
            if (characterElement) {
                characterElement.style.backgroundImage = `url('assets/pose/${selectedChar}_dialog.svg')`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'bottom center';
                characterElement.style.backgroundRepeat = 'no-repeat';
            }
        } else if (screenName === 'game') {
            console.log('Setting game character');
            const characterElement = document.getElementById('game-character');
            if (characterElement) {
                characterElement.style.backgroundImage = `url('assets/pose/${selectedChar}_therapy.svg')`;
                characterElement.style.backgroundSize = 'contain';
                characterElement.style.backgroundPosition = 'center';
                characterElement.style.backgroundRepeat = 'no-repeat';
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
        this.activeSkills = {};
        this.skillsUsed = {};
        this.skillTimers = {};
        this.currentTarget = null;
        this.gameActive = false;
        this.maxCombo = 0;
        this.missCount = 0;
        if (this.targetInterval) {
            clearInterval(this.targetInterval);
            this.targetInterval = null;
        }
        this.updateSkillButtons();
        this.updateStatusPanel();
        this.updateHUD();
    }

    showDialog() {
        const selectedChar = this.selectedCharacter || 'koharu';
        console.log(`Looking for dialog: scene=${this.currentDialog.scene}, char=${selectedChar}, index=${this.currentDialog.index + 1}`);
        
        const dialogData = this.gameData.dialogues.find(d => 
            d.scene_id === this.currentDialog.scene && 
            d.char_id === selectedChar &&
            parseInt(d.order) === this.currentDialog.index + 1
        );

        if (dialogData) {
            // 会話を表示
            console.log(`Found dialog:`, dialogData);
            const characterName = document.getElementById('speaker-name');
            const dialogText = document.getElementById('dialog-text');
            
            // 選択されたキャラクターの名前を表示
            characterName.textContent = this.getCharacterName(selectedChar);
            this.typewriterEffect(dialogText, dialogData.text);
        } else if (this.currentDialog.index >= 3) {
            console.log('All 3 dialogs completed, moving to game screen');
            // 3回の会話完了後、ゲーム画面へ
            this.showScreen('game');
            this.startBodyPartGame();
            this.updateHUD();
        } else {
            console.log('Dialog not found but haven\'t completed 3 dialogs yet');
            // 会話データが見つからないが3回未満の場合はゲーム画面へ
            this.showScreen('game');
            this.startBodyPartGame();
            this.updateHUD();
        }
    }

    getCharacterName(charId) {
        const char = this.gameData.characters.find(c => c.char_id === charId);
        return char ? char.name : 'Unknown';
    }

    typewriterEffect(element, text, speed = 50) {
        if (this.currentTypewriterTimer) {
            clearInterval(this.currentTypewriterTimer);
        }
        
        element.textContent = '';
        let i = 0;
        this.currentTypewriterTimer = setInterval(() => {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
            } else {
                clearInterval(this.currentTypewriterTimer);
                this.currentTypewriterTimer = null;
            }
        }, speed);
    }

    nextDialog() {
        console.log(`nextDialog: current index=${this.currentDialog.index}, incrementing to ${this.currentDialog.index + 1}`);
        this.currentDialog.index++;
        this.showDialog();
    }

    clickBodyPart(partName, event) {
        if (!this.gameActive || !this.currentTarget) {
            return;
        }
        
        // タップ音を即座に再生
        this.playSound('button_hover');
        
        const now = performance.now();
        const targetElement = document.getElementById(`part-${this.currentTarget}`);
        
        if (partName === this.currentTarget) {
            // 正解！
            const reactionTime = now - this.targetStartTime;
            
            if (reactionTime <= 3000) {
                // 3秒以内にクリック成功
                this.combo++;
                
                // 効果計算
                const baseGain = this.getPartBaseGain(partName);
                const comboMultiplier = Math.min(2.0, 1.0 + (this.combo - 1) * 0.1);
                const skillMultiplier = this.getSkillMultiplier(partName);
                const timeBonus = Math.max(0.5, (3000 - reactionTime) / 3000); // 早いほどボーナス
                
                const gain = baseGain * comboMultiplier * skillMultiplier * timeBonus;
                
                this.balance[partName] += gain;
                this.relaxGauge = Math.min(100, this.relaxGauge + gain);
                
                // 成功エフェクト
                targetElement.classList.remove('glowing');
                targetElement.classList.add('hit');
                setTimeout(() => targetElement.classList.remove('hit'), 300);
                
                // 最高コンボ更新チェック
                if (this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                }
                
                // 自動スキル発動チェック
                this.checkAutoSkillTrigger();
                
                // 成功音（少し遅らせて違いを明確に）
                setTimeout(() => {
                    this.playSound('click_soft');
                }, 100);
                console.log(`Hit! Reaction time: ${reactionTime.toFixed(0)}ms, Gain: ${gain.toFixed(2)}`);
            } else {
                // 時間切れ
                this.handleMiss(targetElement, 'timeout');
            }
        } else {
            // 間違った部位をクリック
            this.handleMiss(targetElement, 'wrong_part');
            
            // 間違った部位をクリックした場合も同様にMISS表示
        }
        
        // 次のターゲットを設定
        this.setNextTarget();
        
        // HUD更新
        this.updateStatusPanel();
        this.updateHUD();

        // ゲージMAXチェック
        if (this.relaxGauge >= 100) {
            this.gameActive = false;
            if (this.targetInterval) {
                clearInterval(this.targetInterval);
                this.targetInterval = null;
            }
            setTimeout(() => this.endGame(), 1000);
        }
    }
    
    handleMiss(targetElement, missType = 'timeout') {
        this.combo = 0;
        this.missCount++;
        
        // ミスエフェクト
        if (targetElement) {
            targetElement.classList.remove('glowing');
        }
        
        // ミスタイプに応じた音を再生
        if (missType === 'wrong_part') {
            // 間違った部位をクリックした場合（ブザー音のような感じ）
            setTimeout(() => {
                this.playSound('skill_activate'); // 重めの音で失敗を表現
            }, 50);
        } else if (missType === 'timeout') {
            // 時間切れの場合（がっかり音）
            setTimeout(() => {
                this.playSound('button_click'); // 落胆感のある音
            }, 100);
        }
        
        console.log(`Miss! Type: ${missType}, Combo reset`);
    }
    
    showMissIndicator(targetElement) {
        const missIndicator = document.getElementById('miss-indicator');
        if (missIndicator && targetElement) {
            // targetElementの実際の位置を取得
            const rect = targetElement.getBoundingClientRect();
            const gameCharacter = document.getElementById('game-character');
            const gameRect = gameCharacter.getBoundingClientRect();
            
            // game-character内での相対位置をピクセルで計算
            const relativeX = rect.left + rect.width / 2 - gameRect.left;
            const relativeY = rect.top + rect.height / 2 - gameRect.top;
            
            // ピクセル位置で配置
            missIndicator.style.left = relativeX + 'px';
            missIndicator.style.top = relativeY + 'px';
            missIndicator.style.display = 'block';
            
            // アニメーション終了後に非表示
            setTimeout(() => {
                missIndicator.style.display = 'none';
            }, 600);
        }
    }
    
    showHitIndicator(targetElement, comboCount) {
        const hitIndicator = document.getElementById('hit-indicator');
        const hitText = document.getElementById('hit-text-content');
        if (hitIndicator && hitText && targetElement) {
            // targetElementの実際の位置を取得
            const rect = targetElement.getBoundingClientRect();
            const gameCharacter = document.getElementById('game-character');
            const gameRect = gameCharacter.getBoundingClientRect();
            
            // コンボテキストを設定
            hitText.textContent = `${comboCount} COMBO`;
            
            // game-character内での相対位置をピクセルで計算
            const relativeX = rect.left + rect.width / 2 - gameRect.left;
            const relativeY = rect.top + rect.height / 2 - gameRect.top;
            
            // ピクセル位置で配置
            hitIndicator.style.left = relativeX + 'px';
            hitIndicator.style.top = relativeY + 'px';
            hitIndicator.style.display = 'block';
            
            // アニメーション終了後に非表示
            setTimeout(() => {
                hitIndicator.style.display = 'none';
            }, 800);
        }
    }
    
    startBodyPartGame() {
        console.log('Starting body part game...');
        this.gameActive = true;
        this.combo = 0;
        this.maxCombo = 0;
        this.missCount = 0;
        this.updateStatusPanel();
        this.setNextTarget();
        
        // 定期的にターゲットをチェンジ（時間切れ処理）
        this.targetInterval = setInterval(() => {
            if (this.currentTarget) {
                const now = performance.now();
                if (now - this.targetStartTime > 3000) {
                    // 時間切れ
                    const targetElement = document.getElementById(`part-${this.currentTarget}`);
                    this.handleMiss(targetElement, 'timeout');
                    this.setNextTarget();
                    this.updateStatusPanel();
                    this.updateHUD();
                }
            }
        }, 100);
    }
    
    setNextTarget() {
        // 現在のターゲットをクリア
        if (this.currentTarget) {
            const oldTarget = document.getElementById(`part-${this.currentTarget}`);
            if (oldTarget) {
                oldTarget.classList.remove('glowing');
            }
        }
        
        // ランダムに新しいターゲットを選択
        const bodyParts = ['shoulder', 'neck', 'back', 'waist', 'thigh', 'calf', 'foot'];
        let newTarget;
        do {
            newTarget = bodyParts[Math.floor(Math.random() * bodyParts.length)];
        } while (newTarget === this.currentTarget && bodyParts.length > 1);
        
        this.currentTarget = newTarget;
        this.targetStartTime = performance.now();
        
        // 新しいターゲットを光らせる
        const targetElement = document.getElementById(`part-${this.currentTarget}`);
        if (targetElement) {
            targetElement.classList.add('glowing');
        }
        
        console.log(`New target: ${this.currentTarget}`);
    }
    
    checkAutoSkillTrigger() {
        // オイルマッサージの自動発動条件：20コンボ以上 + リラックスゲージ50%以上
        if (!this.skillsUsed.oil_massage && 
            this.combo >= 20 && 
            this.relaxGauge >= 50) {
            console.log('Auto-triggering Oil Massage!');
            this.useSkill('oil_massage');
        }
        
        // リンパマッサージの自動発動条件：リラックスゲージ70%以上
        if (!this.skillsUsed.lymph_massage && 
            this.relaxGauge >= 70) {
            console.log('Auto-triggering Lymph Massage!');
            this.useSkill('lymph_massage');
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
        let multiplier = 1.0;
        
        // オイルマッサージの効果（クリック倍率+100%）
        if (this.activeSkills.oil_massage) {
            multiplier += 1.0;
        }
        
        // リンパマッサージの効果（クリック倍率+200%）
        if (this.activeSkills.lymph_massage) {
            multiplier += 2.0;
        }
        
        return multiplier;
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
    
    updateStatusPanel() {
        const currentComboElement = document.getElementById('current-combo');
        const maxComboElement = document.getElementById('max-combo');
        const missCountElement = document.getElementById('miss-count');
        
        if (currentComboElement) {
            currentComboElement.textContent = this.combo;
        }
        
        if (maxComboElement) {
            maxComboElement.textContent = this.maxCombo;
        }
        
        if (missCountElement) {
            missCountElement.textContent = this.missCount;
        }
    }

    useSkill(skillId) {
        // 既に使用済みかチェック
        if (this.skillsUsed[skillId]) {
            return;
        }
        
        // 他のスキルが使用中かチェック
        if (Object.keys(this.activeSkills).length > 0) {
            return;
        }

        const skillData = this.gameData.skills.find(s => s.skill_id === skillId);
        if (!skillData) return;

        // カットインを表示
        this.showSkillCutin(skillId);
        
        // 短い遅延後にスキル効果開始
        setTimeout(() => {
            this.playSound('skill_activate');
            
            const duration = parseInt(skillData.duration) * 1000;
            
            // スキル効果をアクティブにする
            this.activeSkills[skillId] = true;
            this.skillsUsed[skillId] = true;
            
            // 全スキルボタンを無効化
            this.updateSkillButtons();
            
            // タイマー表示開始
            this.startSkillTimer(skillId, duration);
            
            // 効果終了タイマー
            setTimeout(() => {
                delete this.activeSkills[skillId];
                this.stopSkillTimer(skillId);
                this.updateSkillButtons();
            }, duration);
            
            console.log(`Skill ${skillId} activated for ${duration}ms`);
        }, 1000); // カットイン表示後1秒で効果開始
    }
    
    showSkillCutin(skillId) {
        const cutinElement = document.getElementById('skill-cutin');
        const cutinImage = document.getElementById('cutin-image');
        
        if (cutinElement && cutinImage) {
            cutinImage.src = `assets/ui/cutin_${skillId.replace('_massage', '')}.svg`;
            cutinElement.style.display = 'flex';
            
            // 2秒後にカットインを隠す
            setTimeout(() => {
                cutinElement.style.display = 'none';
            }, 2000);
        }
    }
    
    startSkillTimer(skillId, duration) {
        const timerElement = document.getElementById(`timer-${skillId.replace('_massage', '')}`);
        if (!timerElement) return;
        
        timerElement.style.display = 'flex';
        let remainingTime = Math.ceil(duration / 1000);
        timerElement.textContent = remainingTime;
        
        this.skillTimers[skillId] = setInterval(() => {
            remainingTime--;
            timerElement.textContent = remainingTime;
            
            if (remainingTime <= 0) {
                this.stopSkillTimer(skillId);
            }
        }, 1000);
    }
    
    stopSkillTimer(skillId) {
        const timerElement = document.getElementById(`timer-${skillId.replace('_massage', '')}`);
        if (timerElement) {
            timerElement.style.display = 'none';
        }
        
        if (this.skillTimers[skillId]) {
            clearInterval(this.skillTimers[skillId]);
            delete this.skillTimers[skillId];
        }
    }

    updateSkillButtons() {
        const skillButtons = document.querySelectorAll('.skill-btn');
        skillButtons.forEach(button => {
            const skillId = button.dataset.skill;
            
            if (this.skillsUsed[skillId] || Object.keys(this.activeSkills).length > 0) {
                button.classList.add('disabled');
                button.classList.remove('active');
            } else {
                button.classList.remove('disabled');
                if (this.activeSkills[skillId]) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            }
        });
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
        try {
            // AudioContextを初回のみ作成
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            // AudioContextがsuspendedの場合は再開
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 音の設定（soundIdに応じて変更）
            let frequency, duration, volume, type = 'sine';
            
            switch(soundId) {
                case 'button_hover':
                    frequency = 800;
                    duration = 0.1;
                    volume = 0.15;
                    type = 'sine';
                    break;
                case 'click_soft':
                    frequency = 1200;
                    duration = 0.15;
                    volume = 0.2;
                    type = 'sine';
                    break;
                case 'skill_activate':
                    frequency = 400;
                    duration = 0.3;
                    volume = 0.25;
                    type = 'square';
                    break;
                case 'button_click':
                    frequency = 300;
                    duration = 0.2;
                    volume = 0.18;
                    type = 'triangle';
                    break;
                default:
                    frequency = 600;
                    duration = 0.1;
                    volume = 0.15;
                    type = 'sine';
            }
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
            console.log(`Playing sound: ${soundId} (${frequency}Hz, ${duration}s, ${type})`);
        } catch (error) {
            console.log(`Sound playback failed: ${soundId}`, error);
        }
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
    
    // 直接クリックイベントをテスト（デバッグ用）
    
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