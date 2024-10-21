import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import { request } from "sats-connect";
// Pobieramy sieć z konfiguracji środowiska
const network = process.env.REACT_APP_NETWORK === 'mainnet' ? new StacksMainnet() : new StacksTestnet();

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

const inscriptions = [
  {
    id: 'b303d7d750bd94e863cfb8aff51c2819aa6efbed74ffdc2347bbe885803fb034i0',
    imageUrl: 'https://homemadegame.com/images/polo-foto01.jpeg',
  },
  {
    id: 'ddfe965edfd29fb950d400fff15cbe6fe2157a3cce982632d6ea1cf37a41b01di0',
    imageUrl: 'https://homemadegame.com/images/polo-foto02.jpeg',
  },
  {
    id: 'ea2269911bef92cec2398284c911daecf6cf536f409c34924e88c3d4e25bc52ci0',
    imageUrl: 'https://homemadegame.com/images/polo-foto03.jpeg',
  },
];

const infoMessage = "Log in to receive market updates and provide your shipping details for your Polo Legacy artwork. If you encounter issues or prefer not to log in, contact us at homemadegame.apps@gmail.com, including your wallet and transaction ID for assistance.";

const WalletConnect = () => {
  const [address, setAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const [ownedInscriptions, setOwnedInscriptions] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [email, setEmail] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState(''); // Obsługa błędów

  // Użyj useEffect do sprawdzania sesji po odświeżeniu strony
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const stxAddress = network.isMainnet() ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;

      // Pobierz adres Bitcoin po zalogowaniu
      const walletType = detectWallet(userData);
      getBitcoinAddress(walletType).then((bitcoinAddress) => {
        if (bitcoinAddress) {
          setAddress(bitcoinAddress);
          setConnected(true);
          checkInscriptions(bitcoinAddress); // Sprawdź inskrypcje
        } else {
          setErrorMessage('Unable to fetch Bitcoin Ordinals address.');
        }
      });
    }
  }, []);

  const authenticate = () => {
    showConnect({
      appDetails: {
        name: 'Ordinals DApp',
        icon: 'https://hiro.so/static/favicon.ico',
      },
      userSession,
      network,
      onFinish: async () => {
        const userData = userSession.loadUserData();
        const stxAddress = network.isMainnet() ? userData.profile.stxAddress.mainnet : userData.profile.stxAddress.testnet;

        // Teraz po zakończeniu logowania, wykrywamy portfel
        const walletType = detectWallet(userData);

        // Pobieramy adres Bitcoin na podstawie typu portfela
        const bitcoinAddress = await getBitcoinAddress(walletType);
        localStorage.setItem('userSession', JSON.stringify(userSession.store));
        if (bitcoinAddress) {
          setAddress(bitcoinAddress);
          setConnected(true);
          checkInscriptions(bitcoinAddress); // Sprawdzamy inskrypcje dla tego adresu
        } else {
          setErrorMessage('Unable to fetch Bitcoin Ordinals address.');
        }
      },
    });
  };

  // Funkcja wykrywająca portfel na podstawie kontekstu logowania użytkownika
  const detectWallet = (userData) => {
    const walletProvider = userData.profile.walletProvider || 'xverse'; // Domyślnie Xverse, jeśli brak walletProvider

    if (walletProvider === 'leather') {
      console.log('Detected Leather Wallet');
      return 'hiro';
    } else {
      console.log('Using Xverse Wallet');
      return 'xverse';
    }
  };

  // Funkcja zwracająca adres Bitcoin na podstawie typu portfela

  const getBitcoinAddress = async (walletType) => {
    try {
      if (walletType === 'hiro') {
        console.log('Fetching Bitcoin address for Leather Wallet');
        if (window.LeatherProvider) {
          const response = await window.LeatherProvider.request("getAddresses");
          const btcAddress = response.result.addresses.find(addr => addr.symbol === "BTC");
          if (btcAddress) {
            return btcAddress.address;
          }
        } else {
          console.error('Leather Wallet not available');
        }
      } else if (walletType === 'xverse') {
        console.log('Fetching Bitcoin address for Xverse Wallet');
        const response = await request("getAddresses", {
          purposes: ['ordinals'], // Tylko ordinals
          message: 'Fetching your Bitcoin address for Ordinals DApp',
        });

        console.log('Response from Xverse:', response);

        if (response.status === "success") {
          // Szukamy adresu z celem 'ordinals'
          const ordinalsAddress = response.result.addresses.find(addr => addr.purpose === "ordinals");
          if (ordinalsAddress) {
            return ordinalsAddress.address;
          } else {
            console.error('No ordinals address found');
          }
        } else {
          console.error('Failed to fetch address from Xverse:', response.error);
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching Bitcoin address:', error);
      return null;
    }
  };

  const checkInscriptions = async (address) => {
    try {
      const response = await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/check-inscriptions', { address });
      const userInscriptions = response.data.inscriptions;

      const owned = inscriptions.filter((inscription) =>
        userInscriptions.some((userInscription) => userInscription.inscription_id === inscription.id)
      );

      if (owned.length > 0) {
        setOwnedInscriptions(owned);
        checkIfUserExists(address); // Sprawdzenie, czy użytkownik istnieje w bazie danych
      } else {
        setErrorMessage("You don't own any of our inscriptions. If you purchased one, please contact us at: homemadegame.apps@gmail.com");
      }
    } catch (error) {
      console.error('Error checking inscriptions:', error);
    }
  };

  const checkIfUserExists = async (walletId) => {
    try {
      const response = await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/check-user', {
        wallet_id: walletId,
      });
      if (!response.data.exists) {
        setShowEmailForm(true); // Pokaż formularz, jeśli użytkownik nie istnieje
      }
    } catch (error) {
      console.error('Error checking user existence:', error);
    }
  };

  const handleSubmitEmail = async (e) => {
    e.preventDefault();
    setFormError(''); // Reset błędu
    try {
      await axios.post('https://verify-nft-1f716b00da6a.herokuapp.com/save-wallet', {
        email,
        wallet_id: address,
      });
      setFormSubmitted(true);
      setShowEmailForm(false);
    } catch (error) {
      setFormError('Error submitting your email. Please try again.');
      console.error('Error saving email:', error);
    }
  };

  const logout = () => {
    localStorage.removeItem('userSession');
    userSession.signUserOut(window.location.origin);
    setConnected(false);
    setAddress('');
    setOwnedInscriptions([]);
  };

  return (
    <div>
      <section id="images" className="counter w-100 pt-5 pb-0 pb-5" style={{ background: '#fff' }}>
        <div className="container-min">
          <div className="row justify-content-center text-center">
            <picture>
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.webp"
                type="image/webp"
              />
              <source
                srcSet="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.jpg"
                type="image/jpeg"
              />
              <img
                decoding="async"
                className="img-fluid"
                src="https://homemadegame.com/wp-content/uploads/2023/05/HomeMadeGame.jpg"
                alt=""
                loading="lazy"
              />
            </picture>
          </div>
        </div>
      </section>

      {connected ? (
        <div className="pt-5 container-min">
          <div className="row justify-content-center text-center">
            <p>Connected address: {address}</p>
            <button onClick={logout} className="button button-red">Logout</button>
            {ownedInscriptions.length > 0 ? (
              <div>
                <h3>Your ordinals: </h3>
                <div className="d-flex ordinals pt-5 justify-content-center">
                  {ownedInscriptions.map((inscription) => (
                    <div className="ordinal" key={inscription.id}>
                      <img src={inscription.imageUrl} alt={`Inscription ${inscription.id}`} className="img-fluid mt-3" />
                      {/* <a href={inscription.imageUrl} className="button" download target="_blank" rel="noreferrer">Download Image</a> */}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              errorMessage && <p>{errorMessage}</p>
            )}

            {showEmailForm && !formSubmitted && (
              <div className="pt-5">
                <h3>Enter your email to receive updates:</h3>
                <form onSubmit={handleSubmitEmail}>
                  <input
                    type="email"
                    value={email}
                    className="input"
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Your email"
                    required
                  />
                  <button type="submit" className="button">Submit</button>
                </form>
                {formError && <p style={{ color: 'red' }}>{formError}</p>} {/* Komunikat błędu */}
              </div>
            )}
            {formSubmitted && <p>Your email has been submitted. Thank you!</p>}
          </div>
        </div>
      ) : (
        <div className="container-min pt-main">
          <div className="row justify-content-center text-center">
            <button onClick={authenticate} className="button">Login Your Wallet</button>
          </div>
          <div className="pt-5 text-center">
            {infoMessage}
          </div>
        </div>
      )}

    </div>
  );
};

export default WalletConnect;