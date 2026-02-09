declare module '@fugood/whisper.node' {
  export interface WhisperOptions {
    model: string;
    useGpu?: boolean;
  }

  export interface TranscribeOptions {
    language?: string;
    temperature?: number;
  }

  export interface WhisperSegment {
    t0: number;
    t1: number;
    text: string;
  }

  export interface WhisperResult {
    segments: WhisperSegment[];
  }

  export interface WhisperContext {
    transcribeFile(
      audioPath: string,
      options: TranscribeOptions
    ): {
      stop: () => void;
      promise: Promise<WhisperResult>;
    };
    transcribeData(
      audioBuffer: Buffer,
      options: TranscribeOptions
    ): {
      stop: () => void;
      promise: Promise<WhisperResult>;
    };
    release?: () => void;
  }

  export function initWhisper(
    options: WhisperOptions,
    libVariant?: string
  ): Promise<WhisperContext>;
}
