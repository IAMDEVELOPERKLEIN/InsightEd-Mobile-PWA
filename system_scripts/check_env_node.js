import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

async function checkEnv() {
  try {
    const { stdout: whichPy } = await execAsync('where python');
    console.log('Python path (where python):', whichPy.trim());
    
    const { stdout: pyVer } = await execAsync('python --version');
    console.log('Python version:', pyVer.trim());
    
    const { stdout: pathVar } = await execAsync('echo %PATH%');
    console.log('PATH variable:', pathVar.trim());
    
    process.exit(0);
  } catch (err) {
    console.error('Environment Check Failed:', err.message);
    process.exit(1);
  }
}
checkEnv();
