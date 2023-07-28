import Logo from '../Logo';
import { Twitter, Github, Coffee, Cat } from 'lucide-react';

import './index.css';

export default function WelcomePage() {
  return (
    <div className="revenote-welcome-page w-full h-full flex pt-20 justify-center">
      <div className="content w-2/3">
        <div className="flex justify-items-center">
          <img
            className="w-10 h-10 mr-2"
            src="https://img.alicdn.com/imgextra/i2/O1CN018OHcu11iiJlvuano5_!!6000000004446-2-tps-720-720.png"
            alt=""
          />
          <Logo className="text-3xl mb-2" />
        </div>
        <p className="mb-5 text-lg">
          A lightweight productivity tool to build Second Brain that integrates note-taking and
          whiteboarding features.
        </p>
        <p className="mb-2">
          <a href="https://github.com/revenote/revenote" target="_blank" rel="noreferrer">
            <Github className="w-4 h-4" /> Official Github
          </a>
        </p>
        <p className="mb-2">
          <a href="https://twitter.com/TheReveNote" target="_blank" rel="noreferrer">
            <Twitter className="w-4 h-4" /> Official Twitter
          </a>
        </p>
        <p className="mb-2">
          <a href="https://www.buymeacoffee.com/korbinzhao" target="_blank" rel="noreferrer">
            <Coffee className="w-4 h-4" /> By me a coffee
          </a>
        </p>
        <p className="mb-2">
          <a href="https://afdian.net/a/wantian" target="_blank" rel="noreferrer">
            <Cat className="w-4 h-4" /> Feed my cat
          </a>
        </p>
        <p className="mb-2">
          <a href="https://twitter.com/korbinzhao" target="_blank" rel="noreferrer">
            <Twitter className="w-4 h-4" /> Follow the author
          </a>
        </p>
      </div>
    </div>
  );
}
