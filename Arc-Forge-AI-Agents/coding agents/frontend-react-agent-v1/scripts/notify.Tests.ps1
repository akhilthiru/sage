#Requires -Modules @{ ModuleName = 'Pester'; ModuleVersion = '5.0' }

BeforeAll {
    $script:ScriptPath = "$PSScriptRoot\notify.ps1"

    # Helper: run notify.ps1 with -SkipSend and capture stdout + exit code
    function Invoke-Notify {
        param(
            [string]$AgentName,
            [string]$Status,
            [string]$Summary,
            [switch]$OmitAgentName,
            [switch]$OmitStatus,
            [switch]$OmitSummary
        )

        $args = @()
        if (-not $OmitAgentName) { $args += '-AgentName', $AgentName }
        if (-not $OmitStatus)    { $args += '-Status',    $Status    }
        if (-not $OmitSummary)   { $args += '-Summary',   $Summary   }
        $args += '-SkipSend'

        $output = powershell -ExecutionPolicy Bypass -File $script:ScriptPath @args 2>&1
        return [PSCustomObject]@{
            Output   = $output -join "`n"
            ExitCode = $LASTEXITCODE
        }
    }
}

Describe 'notify.ps1' {

    Context 'Parameter validation' {

        It 'Exits 1 when AgentName is missing' {
            $result = Invoke-Notify -OmitAgentName -Status 'Completed' -Summary 'Done.'
            $result.ExitCode | Should -Be 1
        }

        It 'Exits 1 when Status is missing' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -OmitStatus -Summary 'Done.'
            $result.ExitCode | Should -Be 1
        }

        It 'Exits 1 when Summary is missing' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -OmitSummary
            $result.ExitCode | Should -Be 1
        }

        It 'Exits 1 when Status value is not in the allowed set' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Unknown' -Summary 'Done.'
            $result.ExitCode | Should -Be 1
        }

        It 'Accepts Completed as a valid Status' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'Done.'
            $result.ExitCode | Should -Be 0
        }

        It 'Accepts Blocked as a valid Status' {
            $result = Invoke-Notify -AgentName 'Planning Agent' -Status 'Blocked' -Summary 'Waiting on user.'
            $result.ExitCode | Should -Be 0
        }

        It 'Accepts Failed as a valid Status' {
            $result = Invoke-Notify -AgentName 'Unit Test Agent' -Status 'Failed' -Summary '3 tests failing.'
            $result.ExitCode | Should -Be 0
        }
    }

    Context 'Title formatting' {

        It 'Prefixes Completed title with [OK]' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'Done.'
            $result.Output | Should -Match '\[OK\] Coding Agent : Completed'
        }

        It 'Prefixes Blocked title with [BLOCKED]' {
            $result = Invoke-Notify -AgentName 'Planning Agent' -Status 'Blocked' -Summary 'Needs approval.'
            $result.Output | Should -Match '\[BLOCKED\] Planning Agent : Blocked'
        }

        It 'Prefixes Failed title with [FAILED]' {
            $result = Invoke-Notify -AgentName 'Unit Test Agent' -Status 'Failed' -Summary 'Suite red.'
            $result.Output | Should -Match '\[FAILED\] Unit Test Agent : Failed'
        }
    }

    Context 'Summary truncation' {

        It 'Passes through a summary shorter than 200 chars unchanged' {
            $short = 'Short summary'
            $result = Invoke-Notify -AgentName 'Knowledge Agent' -Status 'Completed' -Summary $short
            $pattern = [regex]::Escape($short)
            $result.Output | Should -Match $pattern
        }

        It 'Truncates a summary longer than 200 chars to 197 + ellipsis' {
            $long = 'A' * 210
            $result = Invoke-Notify -AgentName 'Knowledge Agent' -Status 'Completed' -Summary $long
            $pattern = [regex]::Escape(('A' * 197) + '...')
            $result.Output | Should -Match $pattern
        }

        It 'Truncates a summary of exactly 201 chars' {
            $edge = 'B' * 201
            $result = Invoke-Notify -AgentName 'Knowledge Agent' -Status 'Completed' -Summary $edge
            $pattern = [regex]::Escape(('B' * 197) + '...')
            $result.Output | Should -Match $pattern
        }

        It 'Does not truncate a summary of exactly 200 chars' {
            $exact = 'C' * 200
            $result = Invoke-Notify -AgentName 'Knowledge Agent' -Status 'Completed' -Summary $exact
            $pattern = [regex]::Escape($exact)
            $result.Output | Should -Match $pattern
            $result.Output | Should -Not -Match '\.\.\.'
        }
    }

    Context 'XML escaping' {

        It 'Escapes ampersand in summary' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'React & TypeScript done.'
            $result.Output | Should -Match '&amp;'
        }

        It 'Escapes less-than in summary' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'Score < 50 flagged.'
            $result.Output | Should -Match '&lt;'
        }

        It 'Escapes greater-than in summary' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'Score > 80 passed.'
            $result.Output | Should -Match '&gt;'
        }

        It 'Escapes single-quotes in AgentName' {
            # Single-quotes survive PowerShell subprocess argument passing; SecurityElement escapes them as &apos;
            $result = Invoke-Notify -AgentName "Agent 'X'" -Status 'Completed' -Summary 'Done.'
            $result.Output | Should -Match '&apos;'
        }
    }

    Context 'XML structure' {

        It 'Produces a valid XML document' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            { [xml]$result.Output } | Should -Not -Throw
        }

        It 'Root element is toast' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            $doc = [xml]$result.Output
            $doc.DocumentElement.LocalName | Should -Be 'toast'
        }

        It 'toast has duration=short' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            $doc = [xml]$result.Output
            $doc.toast.duration | Should -Be 'short'
        }

        It 'Contains two text elements under binding' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            $doc = [xml]$result.Output
            $textNodes = $doc.toast.visual.binding.text
            $textNodes.Count | Should -Be 2
        }

        It 'First text element contains the title' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            $doc = [xml]$result.Output
            # PowerShell XML typefmt returns same-named children as a string array
            $doc.toast.visual.binding.text[0] | Should -Match 'Coding Agent'
        }

        It 'Second text element contains the summary' {
            $result = Invoke-Notify -AgentName 'Coding Agent' -Status 'Completed' -Summary 'All files created.'
            $doc = [xml]$result.Output
            $doc.toast.visual.binding.text[1] | Should -Be 'All files created.'
        }
    }

    Context 'Integration (live toast)' {

        It 'Sends a real Completed toast without error' {
            $output = powershell -ExecutionPolicy Bypass -File $script:ScriptPath `
                -AgentName 'Unit Test Agent' `
                -Status 'Completed' `
                -Summary 'notify.Tests.ps1 integration test passed.' 2>&1
            $LASTEXITCODE | Should -Be 0
        }

        It 'Sends a real Blocked toast without error' {
            $output = powershell -ExecutionPolicy Bypass -File $script:ScriptPath `
                -AgentName 'Planning Agent' `
                -Status 'Blocked' `
                -Summary 'Integration test: Blocked toast.' 2>&1
            $LASTEXITCODE | Should -Be 0
        }

        It 'Sends a real Failed toast without error' {
            $output = powershell -ExecutionPolicy Bypass -File $script:ScriptPath `
                -AgentName 'Code Review Agent' `
                -Status 'Failed' `
                -Summary 'Integration test: Failed toast.' 2>&1
            $LASTEXITCODE | Should -Be 0
        }
    }
}
