import Logo from '../Logo';
import { Twitter, Github, Coffee, Cat, FolderPlus, FileType, Palette } from 'lucide-react';

import './index.css';

export default function WelcomePage() {
  return (
    <div className="revenote-welcome-page w-full h-full flex pt-20 justify-center">
      <div className="content w-2/3">
        <div className="flex items-end mb-6">
          <img
            className="w-16 h-16 mr-4"
            src="https://img.alicdn.com/imgextra/i2/O1CN01Ei2rTp1x7sUnWKWj3_!!6000000006397-2-tps-720-720.png"
            alt=""
          />
          <Logo className="text-4xl mb-2" />
        </div>
        <p className="mb-6 text-lg">
          A lightweight productivity tool to build Second Brain that integrates note-taking and
          whiteboarding features.
        </p>
        <div className="mb-6">
          <h2 className="mb-2 text-base">Add Operation Description</h2>
          <p className="mb-2">
            Click the icons in left sidebar operation toolbar to add a foler/note/board.
          </p>
          <ul>
            <li className="mb-2 list-disc list-inside">
              <FolderPlus className="mr-2 w-4" />
              Add a folder
            </li>
            <li className="mb-2 list-disc list-inside">
              <FileType className="mr-2 w-4" />
              Add a note
            </li>
            <li className="mb-2 list-disc list-inside">
              <Palette className="mr-2 w-4" />
              Add a board
            </li>
          </ul>
        </div>
        <div>
          <h2 className="mb-2 text-base">Links</h2>
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
    </div>
  );
}
