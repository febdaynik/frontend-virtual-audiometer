/**
 * Audio Generator для аудиометрии
 * Генерирует чистые тоны на заданной частоте и громкости
 */

class AudioGenerator {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private isPlaying: boolean = false;

  // Референсный уровень для калибровки (0 дБ HL ≈ порог слышимости)
  // Это приблизительное значение, в реальности нужна калибровка для конкретных наушников
  private readonly REFERENCE_GAIN = 0.01; // Базовый gain для 0 дБ
  private readonly MAX_DB = 120;

  /**
   * Инициализация AudioContext (должна вызываться после пользовательского взаимодействия)
   */
  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Конвертация дБ в линейный gain
   * dB = 20 * log10(gain / reference)
   * gain = reference * 10^(dB/20)
   */
  private dbToGain(db: number): number {
    // Ограничиваем диапазон
    const clampedDb = Math.max(0, Math.min(db, this.MAX_DB));
    // Конвертируем дБ в линейный gain
    const gain = this.REFERENCE_GAIN * Math.pow(10, clampedDb / 20);
    // Ограничиваем максимальный gain чтобы не повредить слух
    return Math.min(gain, 1.0);
  }

  /**
   * Воспроизведение тона
   * @param frequency - Частота в Гц (250-8000)
   * @param dbLevel - Уровень громкости в дБ (0-120)
   * @param ear - Ухо: 'left', 'right', или 'both'
   * @param duration - Длительность в мс (по умолчанию 1000мс)
   */
  async playTone(
      frequency: number,
      dbLevel: number,
      ear: 'left' | 'right' | 'both' = 'both',
      duration: number = 1000
  ): Promise<void> {
    await this.init();

    // Останавливаем предыдущий тон если играет
    this.stop();

    if (!this.audioContext) return;

    // Создаём осциллятор
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

    // Создаём gain node для громкости
    this.gainNode = this.audioContext.createGain();
    const gain = this.dbToGain(dbLevel);

    // Плавное нарастание и затухание (чтобы избежать щелчков)
    const now = this.audioContext.currentTime;
    const rampTime = 0.02; // 20ms
    this.gainNode.gain.setValueAtTime(0, now);
    this.gainNode.gain.linearRampToValueAtTime(gain, now + rampTime);
    this.gainNode.gain.setValueAtTime(gain, now + (duration / 1000) - rampTime);
    this.gainNode.gain.linearRampToValueAtTime(0, now + (duration / 1000));

    // Создаём panner для выбора уха
    this.pannerNode = this.audioContext.createStereoPanner();
    switch (ear) {
      case 'left':
        this.pannerNode.pan.setValueAtTime(-1, this.audioContext.currentTime);
        break;
      case 'right':
        this.pannerNode.pan.setValueAtTime(1, this.audioContext.currentTime);
        break;
      default:
        this.pannerNode.pan.setValueAtTime(0, this.audioContext.currentTime);
    }

    // Соединяем цепочку
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.pannerNode);
    this.pannerNode.connect(this.audioContext.destination);

    // Запускаем
    this.oscillator.start(now);
    this.oscillator.stop(now + (duration / 1000));
    this.isPlaying = true;

    // Автоматическая остановка
    this.oscillator.onended = () => {
      this.isPlaying = false;
      this.cleanup();
    };
  }

  /**
   * Воспроизведение пульсирующего тона (как в реальной аудиометрии)
   * Тон подаётся прерывисто: 200ms звук, 200ms тишина
   */
  async playPulsedTone(
      frequency: number,
      dbLevel: number,
      ear: 'left' | 'right' | 'both' = 'both',
      totalDuration: number = 2000,
      pulseOn: number = 200,
      pulseOff: number = 200
  ): Promise<void> {
    await this.init();
    this.stop();

    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;
    const gain = this.dbToGain(dbLevel);
    const pulseCycle = (pulseOn + pulseOff) / 1000;
    const numPulses = Math.floor(totalDuration / (pulseOn + pulseOff));

    // Создаём осциллятор
    this.oscillator = this.audioContext.createOscillator();
    this.oscillator.type = 'sine';
    this.oscillator.frequency.setValueAtTime(frequency, now);

    // Создаём gain node
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.setValueAtTime(0, now);

    // Программируем пульсации
    const rampTime = 0.01; // 10ms для плавности
    for (let i = 0; i < numPulses; i++) {
      const pulseStart = now + i * pulseCycle;
      const pulseEnd = pulseStart + (pulseOn / 1000);

      // Нарастание
      this.gainNode.gain.setValueAtTime(0, pulseStart);
      this.gainNode.gain.linearRampToValueAtTime(gain, pulseStart + rampTime);
      // Удержание
      this.gainNode.gain.setValueAtTime(gain, pulseEnd - rampTime);
      // Затухание
      this.gainNode.gain.linearRampToValueAtTime(0, pulseEnd);
    }

    // Panner для выбора уха
    this.pannerNode = this.audioContext.createStereoPanner();
    switch (ear) {
      case 'left':
        this.pannerNode.pan.setValueAtTime(-1, now);
        break;
      case 'right':
        this.pannerNode.pan.setValueAtTime(1, now);
        break;
      default:
        this.pannerNode.pan.setValueAtTime(0, now);
    }

    // Соединяем
    this.oscillator.connect(this.gainNode);
    this.gainNode.connect(this.pannerNode);
    this.pannerNode.connect(this.audioContext.destination);

    // Запускаем
    this.oscillator.start(now);
    this.oscillator.stop(now + (totalDuration / 1000));
    this.isPlaying = true;

    this.oscillator.onended = () => {
      this.isPlaying = false;
      this.cleanup();
    };
  }

  /**
   * Остановка воспроизведения
   */
  stop(): void {
    if (this.oscillator && this.isPlaying) {
      try {
        this.oscillator.stop();
      } catch (e) {
        // Игнорируем ошибку если уже остановлен
      }
    }
    this.cleanup();
    this.isPlaying = false;
  }

  /**
   * Очистка ресурсов
   */
  private cleanup(): void {
    if (this.oscillator) {
      this.oscillator.disconnect();
      this.oscillator = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.pannerNode) {
      this.pannerNode.disconnect();
      this.pannerNode = null;
    }
  }

  /**
   * Проверка, играет ли сейчас тон
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Закрытие AudioContext
   */
  async close(): Promise<void> {
    this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
export const audioGenerator = new AudioGenerator();
