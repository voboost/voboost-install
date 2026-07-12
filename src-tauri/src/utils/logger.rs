use chrono::Local;
use std::sync::Mutex;

/// Maximum number of log entries retained in memory. Older entries are dropped
/// once this cap is reached, so a long-running GUI session (which polls devices
/// every 2 s and runs multi-step installs with retries) cannot grow the buffer
/// without bound.
const MAX_LOG_ENTRIES: usize = 2000;

static LOG: std::sync::LazyLock<Mutex<Vec<LogEntry>>> = std::sync::LazyLock::new(|| Mutex::new(Vec::new()));

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}

pub fn log(level: &str, message: &str) {
    let entry = LogEntry {
        timestamp: Local::now().format("%H:%M:%S%.3f").to_string(),
        level: level.to_string(),
        message: message.to_string(),
    };

    if let Ok(mut log) = LOG.lock() {
        log.push(entry);
        // Evict the oldest entries once the cap is exceeded so the buffer
        // stays bounded for the lifetime of the process.
        if log.len() > MAX_LOG_ENTRIES {
            let excess = log.len() - MAX_LOG_ENTRIES;
            log.drain(0..excess);
        }
    }
}

#[allow(dead_code)]
pub fn get_log() -> Vec<LogEntry> {
    LOG.lock().map(|l| l.clone()).unwrap_or_default()
}

#[allow(dead_code)]
pub fn clear_log() {
    if let Ok(mut log) = LOG.lock() {
        log.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    // The logger is a process-wide shared global, so the tests that observe
    // its contents must run serially. This guard mutex is held for the
    // duration of each logger test to prevent parallel races.
    static TEST_LOCK: std::sync::LazyLock<Mutex<()>> = std::sync::LazyLock::new(|| Mutex::new(()));

    #[test]
    fn test_log_appends_entry() {
        let _guard = TEST_LOCK.lock().unwrap();
        clear_log();
        log("INFO", "first");
        log("ERROR", "second");
        let entries = get_log();
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].level, "INFO");
        assert_eq!(entries[0].message, "first");
        assert_eq!(entries[1].level, "ERROR");
        assert_eq!(entries[1].message, "second");
        clear_log();
    }

    #[test]
    fn test_log_buffer_is_capped() {
        let _guard = TEST_LOCK.lock().unwrap();
        clear_log();
        // Push well beyond the cap; the buffer must not grow without bound.
        for i in 0..(MAX_LOG_ENTRIES + 500) {
            log("INFO", &format!("entry {}", i));
        }
        let entries = get_log();
        assert_eq!(
            entries.len(),
            MAX_LOG_ENTRIES,
            "buffer must be capped at MAX_LOG_ENTRIES"
        );
        // The oldest entries are evicted; the first retained entry must be
        // one of the later pushes, not entry 0.
        assert_ne!(entries[0].message, "entry 0");
        // The newest entry is always the last pushed.
        assert_eq!(
            entries.last().unwrap().message,
            format!("entry {}", MAX_LOG_ENTRIES + 499)
        );
        clear_log();
    }

    #[test]
    fn test_log_timestamp_is_populated() {
        let _guard = TEST_LOCK.lock().unwrap();
        clear_log();
        log("INFO", "ts check");
        let entries = get_log();
        assert_eq!(entries.len(), 1);
        // Timestamp is HH:MM:SS.mmm — at least 12 chars.
        assert!(entries[0].timestamp.len() >= 12);
        clear_log();
    }
}
