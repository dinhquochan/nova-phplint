exports.activate = function() {
  // Do work when the extension is activated.
}

exports.deactivate = function() {
  // Clean up state before the extension is deactivated
}

const execute = (path,  options) => {
  return new Promise((resolve) => {
    const process = new Process(path, options)

    // Copy all stdout into an array of lines.
    const stdout = []
  
    process.onStdout((line) => stdout.push(line))

    // Copy all stderr into an array of lines.
    const stderr = []
    process.onStderr((line) => stderr.push(line))

    // Resolve the promise once the process has exited,
    // with the stdout and stderr as single strings and the status code number.
    process.onDidExit((status) =>
      resolve({
        status,
        stderr: stderr.join("\n"),
        stdout: stdout.join("\n"),
      })
    )

    // Start the process.
    process.start()
  })
}

class IssuesProvider {
  constructor() {
    //
  }
  
  async findPHPPath() {
    const { stdout, status } = await execute("/usr/bin/env", {
      args: ["which", "php"],
    })
    
    return status === 0 ? stdout.trim() : null
  }
  
  async resolvePHPPath() {
    const execPathFromWorkspaceConfig = nova.workspace.config.get('DinhQuocHan.PHPLint.execPath')
    const execPathFromConfig = (execPathFromWorkspaceConfig
      ? execPathFromWorkspaceConfig
      : nova.config.get('DinhQuocHan.PHPLint.execPath'))
    
    if (execPathFromConfig) {
      this.phpPath = execPathFromConfig
      return
    }
    
    try {
      this.phpPath = await this.findPHPPath()
    
      if (! this.phpPath) {
        throw new Error('PHP not installed on your $PATH.')
      }
    } catch (error) {
      console.error('Failed to find php path.')
      console.error(error)
    }
  }
  
  async provideIssues(editor) {
    await this.resolvePHPPath()
    
    const issues = []
    const filePath = editor.document.path
    const phpPath = this.phpPath

    const execOptions = {
      args: [
        phpPath,
        '-l',
        '-n',
        '-d',
        'display_errors=On',
        '-d',
        'log_errors=Off',
        filePath
      ]
    }
    const { stdout, status } = await execute('/usr/bin/env', execOptions)
    
    const searchError = stdout.search('No syntax errors')
    
    if (searchError !== -1) {
      return issues
    }
    
    const regex = /^(?:Parse|Fatal) (error):(\s*(parse|syntax) error,?)?\s*((?:unexpected \'([^\']+)\')?.*) (?:in - )?on line (\d+)/gm
    const found = regex.exec(stdout)
  
    if (found[0] || false) {
      const issue = new Issue()
      const type = found[3]
      const message = found[4].replace(filePath, nova.workspace.relativizePath(filePath))
      issue.message = `Error (${type}): ${message}`
      issue.severity = IssueSeverity.Error
      issue.line = parseInt(found[6])
      issue.column = 0

      issues.push(issue)
    }
    
    return issues
  }
}

nova.assistants.registerIssueAssistant('php', new IssuesProvider())
