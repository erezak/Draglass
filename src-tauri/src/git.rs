use std::process::Command;

#[derive(serde::Serialize)]
pub struct GitStatus {
    pub is_git_repo: bool,
    pub git_available: bool,
}

#[derive(serde::Serialize)]
pub struct GitCommitResult {
    pub committed: bool,
    pub message: String,
}

pub fn git_status_impl(vault_path: &str) -> GitStatus {
    // Check if git binary is accessible
    let git_available = Command::new("git")
        .arg("--version")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    if !git_available {
        return GitStatus {
            is_git_repo: false,
            git_available: false,
        };
    }

    // Check if the vault directory is inside a git repo
    let is_git_repo = Command::new("git")
        .args(["rev-parse", "--is-inside-work-tree"])
        .current_dir(vault_path)
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    GitStatus {
        is_git_repo,
        git_available,
    }
}

pub fn git_commit_impl(vault_path: &str) -> Result<GitCommitResult, String> {
    // Stage all changes
    let add_output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(vault_path)
        .output()
        .map_err(|e| format!("git add failed: {e}"))?;

    if !add_output.status.success() {
        let stderr = String::from_utf8_lossy(&add_output.stderr).into_owned();
        return Err(format!("git add: {stderr}"));
    }

    // Build a simple timestamp using seconds since epoch
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let msg = format!("DraGlass auto-commit ({secs})");

    let commit_output = Command::new("git")
        .args(["commit", "-m", &msg])
        .current_dir(vault_path)
        .output()
        .map_err(|e| format!("git commit failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&commit_output.stdout).into_owned();
    let stderr = String::from_utf8_lossy(&commit_output.stderr).into_owned();
    let combined = format!("{stdout}{stderr}");

    if !commit_output.status.success() {
        // "nothing to commit" is not an error condition
        if combined.contains("nothing to commit") || combined.contains("nothing added to commit") {
            return Ok(GitCommitResult {
                committed: false,
                message: "nothing to commit".to_string(),
            });
        }
        return Err(format!("git commit: {stderr}"));
    }

    Ok(GitCommitResult {
        committed: true,
        message: stdout.trim().to_string(),
    })
}

pub fn git_push_impl(vault_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .arg("push")
        .current_dir(vault_path)
        .output()
        .map_err(|e| format!("git push failed: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        return Err(format!("git push: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}

pub fn git_pull_impl(vault_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .arg("pull")
        .current_dir(vault_path)
        .output()
        .map_err(|e| format!("git pull failed: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        return Err(format!("git pull: {stderr}"));
    }

    Ok(String::from_utf8_lossy(&output.stdout).into_owned())
}
