<?php
// Fallback SPA : on sert toujours l'index.html (le router JS prend le relais).
readfile(__DIR__ . '/index.html');
