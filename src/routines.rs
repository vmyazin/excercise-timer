//! Local workout snapshots. Each change merges with the latest file under a lock.
use exercise_timer::timer::Config;
use serde::{Deserialize, Serialize};
use std::{
    fs::{self, File},
    io::{self, ErrorKind},
    path::{Path, PathBuf},
};
use tempfile::NamedTempFile;

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Workout {
    pub name: String,
    pub config: Config,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Routine {
    pub workout: Workout,
    pub pinned: bool,
}

#[derive(Default, Debug, Serialize, Deserialize)]
pub struct Library {
    // Append-only. The position is also the stable identifier for pin edits.
    pub routines: Vec<Routine>,
    pub last: Option<Workout>,
}

pub fn library_path() -> io::Result<PathBuf> {
    let home = std::env::home_dir().ok_or_else(|| io::Error::other("Home folder unavailable"))?;
    Ok(home.join("Library/Application Support/com.vm.excercise-timer/routines.json"))
}

impl Library {
    pub fn read(path: &Path) -> io::Result<Self> {
        let bytes = match fs::read(path) {
            Ok(bytes) => bytes,
            Err(err) if err.kind() == ErrorKind::NotFound => return Ok(Self::default()),
            Err(err) => return Err(err),
        };
        let library: Self = serde_json::from_slice(&bytes)?;
        for workout in library
            .routines
            .iter()
            .map(|r| &r.workout)
            .chain(&library.last)
        {
            workout
                .config
                .validate()
                .map_err(|msg| io::Error::new(ErrorKind::InvalidData, msg))?;
            if workout.name.trim().is_empty() {
                return Err(io::Error::new(ErrorKind::InvalidData, "Empty workout name"));
            }
        }
        Ok(library)
    }

    pub fn update(&mut self, path: &Path, edit: impl FnOnce(&mut Self)) -> io::Result<()> {
        let dir = path
            .parent()
            .ok_or_else(|| io::Error::other("Missing routine folder"))?;
        fs::create_dir_all(dir)?;
        let lock = File::options()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(path.with_extension("lock"))?;
        lock.lock()?;
        let mut latest = Self::read(path)?;
        edit(&mut latest);
        let temp = NamedTempFile::new_in(dir)?;
        serde_json::to_writer(temp.as_file(), &latest)?;
        temp.as_file().sync_all()?;
        temp.persist(path)?;
        *self = latest;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn separate_sessions_merge_pins_and_last_start() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("routines.json");
        let mut first = Library::read(&path).unwrap();
        let mut second = Library::read(&path).unwrap();
        assert!(first.routines.is_empty() && first.last.is_none());
        let workout = Workout {
            name: "Morning circuit".into(),
            config: Config {
                preset: true,
                rest: true,
                ..Config::default()
            },
        };
        first
            .update(&path, |l| {
                l.routines.push(Routine {
                    workout: workout.clone(),
                    pinned: false,
                })
            })
            .unwrap();
        second
            .update(&path, |l| l.last = Some(workout.clone()))
            .unwrap();
        first
            .update(&path, |l| l.routines[0].pinned = true)
            .unwrap();
        let reopened = Library::read(&path).unwrap();
        assert_eq!(reopened.last, Some(workout.clone()));
        assert_eq!(reopened.routines[0].workout, workout);
        assert!(reopened.routines[0].pinned);
    }
    #[test]
    fn unreadable_library_survives_attempted_update() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("routines.json");
        fs::write(&path, b"incomplete").unwrap();
        assert!(Library::default().update(&path, |_| ()).is_err());
        assert_eq!(fs::read(&path).unwrap(), b"incomplete");
    }
}
