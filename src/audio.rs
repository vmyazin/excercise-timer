use exercise_timer::timer::Cue;
use rodio::{OutputStream, OutputStreamBuilder, Sink, Source, source::SineWave};
use std::time::Duration;

pub struct Audio {
    // Keep the device stream alive for the lifetime of its sounds.
    stream: OutputStream,
    sink: Sink,
}

impl Audio {
    pub fn new() -> Result<Self, String> {
        let mut stream = OutputStreamBuilder::open_default_stream().map_err(|e| e.to_string())?;
        stream.log_on_drop(false);
        let sink = Sink::connect_new(stream.mixer());
        Ok(Self { stream, sink })
    }

    pub fn finished(&self) -> bool {
        self.sink.empty()
    }

    pub fn play(&mut self, cue: Cue) {
        self.sink.clear();
        self.sink = Sink::connect_new(self.stream.mixer());
        let notes: &[(f32, u64, u64)] = match cue {
            Cue::Warning => &[(1000.0, 300, 0)],
            Cue::Transition => &[(1200.0, 500, 0)],
            Cue::Complete => &[(800.0, 200, 0), (1000.0, 200, 100), (1200.0, 400, 100)],
        };
        for &(hz, milliseconds, delay) in notes {
            self.sink.append(
                SineWave::new(hz)
                    .take_duration(Duration::from_millis(milliseconds))
                    .fade_in(Duration::from_millis(5))
                    .fade_out(Duration::from_millis(milliseconds))
                    .amplify(0.25)
                    .delay(Duration::from_millis(delay)),
            );
        }
    }
}
