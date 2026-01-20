# E-Health Platform - Setup Guide

## Quick Start Checklist

Follow these steps in order to set up the E-Health Platform:

### ✅ Prerequisites Installation

1. **Install Node.js** (v16+)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Install Python** (v3.8+)
   - Download from: https://www.python.org/
   - Verify: `python --version`

3. **Install MongoDB**
   - Download from: https://www.mongodb.com/try/download/community
   - Start service: `net start MongoDB` (Windows) or `brew services start mongodb-community` (macOS)
   - Verify: `mongosh` or `mongo`

4. **Install Ganache**
   - Download from: https://trufflesuite.com/ganache/
   - Launch and configure:
     - Port: 7545
     - Network ID: 5777
     - Auto-mine: ON

5. **Install MetaMask**
   - Browser extension: https://metamask.io/
   - Create or import wallet

---

## 🔧 Backend Setup

### Step 1: Navigate to Backend
```bash
cd backend-fastapi
```

### Step 2: Create Virtual Environment
```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables
```bash
# Copy example file
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux
```

Edit `.env` file with your settings:
```env
# MongoDB
MONGO_URI=mongodb://localhost:27017/
DB_NAME=ehealth

# Security
SECRET_KEY=your-super-secret-jwt-key-change-this

# Blockchain (Ganache)
GANACHE_URL=http://127.0.0.1:7545
ADMIN_PRIVATE_KEY=<copy-from-ganache-accounts>
CONTRACT_ADDRESS=<will-be-filled-after-deployment>
```

### Step 5: Deploy Smart Contract
```bash
python deploy.py
```
- Copy the contract address from output
- Paste it into `.env` as `CONTRACT_ADDRESS`

### Step 6: Test Blockchain Connection
```bash
python test_blockchain.py
```
Expected output: "✓ All blockchain tests passed!"

### Step 7: Start Backend Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Backend will run at: http://localhost:8000

---

## 🎨 Frontend Setup

### Step 1: Navigate to Frontend
```bash
cd frontend
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Backend URL (if needed)
Edit `src/utils/constants.ts` if your backend is not at `http://localhost:8000`:
```typescript
export const API_BASE_URL = 'http://localhost:8000';
```

### Step 4: Start Development Server
```bash
npm run dev
```
Frontend will run at: http://localhost:5173

---

## 🔗 MetaMask Configuration

### Step 1: Add Ganache Network
1. Open MetaMask
2. Click network dropdown → "Add Network"
3. Fill in:
   - **Network Name**: Ganache Local
   - **RPC URL**: http://127.0.0.1:7545
   - **Chain ID**: 1337 (or 5777)
   - **Currency Symbol**: ETH

### Step 2: Import Ganache Accounts
1. In Ganache, click the key icon next to any account
2. Copy the private key
3. In MetaMask: Menu → Import Account → Paste private key
4. Repeat for 2-3 accounts (for testing different users)

---

## 🧪 Testing the Application

### 1. Register Users
- Open http://localhost:5173
- Register as Patient (use one MetaMask account)
- Register as Doctor (use different MetaMask account)

### 2. Link Wallets
- Login as Patient → Click "Link Wallet" → Connect MetaMask
- Login as Doctor → Click "Link Wallet" → Connect MetaMask

### 3. Grant Access
- As Patient: Navigate to "Manage Access"
- Enter Doctor's wallet address
- Click "Grant Access" → Approve MetaMask transaction

### 4. View Records
- As Doctor: Navigate to "Patient Records"
- Enter Patient's wallet address
- View prescription and medical history

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh

# If not, start it:
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
```

### Ganache Connection Error
- Ensure Ganache is running on port 7545
- Check `GANACHE_URL` in `.env`
- Verify admin account has ETH balance

### MetaMask Transaction Fails
- Check you're on Ganache network
- Ensure account has sufficient ETH
- Reset account in MetaMask (Settings → Advanced → Reset Account)

### Contract Deployment Fails
- Verify Ganache is running
- Check `ADMIN_PRIVATE_KEY` is correct
- Ensure admin account has ETH

### Frontend Can't Connect to Backend
- Verify backend is running on port 8000
- Check CORS settings in `main.py`
- Verify `API_BASE_URL` in frontend constants

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **Ganache Documentation**: https://trufflesuite.com/docs/ganache/
- **Web3.py Documentation**: https://web3py.readthedocs.io/
- **FastAPI Documentation**: https://fastapi.tiangolo.com/

---

## 🔐 Security Notes

⚠️ **IMPORTANT**: This setup is for development only!

For production deployment:
1. Use a secure SECRET_KEY (generate with `openssl rand -hex 32`)
2. Deploy to a real Ethereum network (testnet or mainnet)
3. Use environment-specific configuration
4. Enable HTTPS
5. Implement rate limiting
6. Add input validation and sanitization
7. Use production-grade MongoDB deployment
8. Never commit `.env` file to Git

---

## 📝 Next Steps

After setup:
1. Explore the API documentation at `/docs`
2. Test all user flows (patient, doctor, admin)
3. Review smart contract code in `blockchain/contracts/`
4. Customize UI in `frontend/src/components/`
5. Add additional features as needed

---

## 💡 Tips

- Keep Ganache running while developing
- Use different browser profiles for testing different users
- Check browser console for frontend errors
- Check terminal for backend errors
- Use MongoDB Compass for database visualization
- Use Remix IDE for smart contract debugging

---

## 🆘 Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review error messages in terminal/console
3. Check GitHub issues
4. Ensure all prerequisites are properly installed
5. Verify all configuration files are correct

Happy coding! 🚀
