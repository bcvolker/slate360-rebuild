// Slate360 Splat desktop launcher stub.
//
// Compiled twice (see build-launchers.ps1) into "Slate360 Splat.exe" and
// "Slate360 Splat Lab.exe" with the Slate360 hex-S icon baked in as the Win32
// icon resource. The .exe files themselves are placed on the Desktop, so Explorer
// shows a normal program icon with NO shortcut-arrow overlay (the overlay is only
// drawn on .lnk files). All the real work still happens in launch.ps1; this stub
// only starts it hidden and exits.
using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

static class Program
{
    // Replaced at build time: "proven" or "lab".
    const string Clone = "__CLONE__";

    [STAThread]
    static int Main()
    {
        try
        {
            string script = @"C:\s360\scripts\splat-lab\launch.ps1";
            if (!File.Exists(script))
            {
                MessageBox.Show("Slate360 launcher script is missing:\n" + script,
                    "Slate360 Splat", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return 1;
            }
            var psi = new ProcessStartInfo
            {
                FileName = @"C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"" + script + "\" -Clone " + Clone,
                UseShellExecute = false,
                CreateNoWindow = true,
                WorkingDirectory = @"C:\s360",
            };
            Process.Start(psi);
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Slate360 Splat could not start:\n\n" + ex.Message,
                "Slate360 Splat", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }
}
