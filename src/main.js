import Phaser from 'phaser'
import "./style.css";

const config = { //dane konfiguracyjne, tutaj nic nie trzeba zmieniać(chyba)
    type: Phaser.AUTO,
  width: 1000,
  height: 720,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 500},
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};
var game = new Phaser.Game(config);

let sceneWidth=4000; //szerokość całej sceny
let diamenty= 20; //ilość diamentow do zebrania
let wrogowie= 8; //ilość wrogów do pokonania, albo i nie



function preload() { //ładowanie obiektów  tutaj będziesz musiała zamiast tych ścieżek dać ścieżki do swoich obrazków
                      //wszystkie niech będą w formacie png i przeźroczyste tło
    this.load.baseURL = "https://examples.phaser.io/assets/";
    this.load.crossOrigin = "anonymous";

   

    this.load.image("background", "games/starstruck/background.png"); //tło (njalepiej jak tło będzie o wymiarach około 2000x720)
    this.load.image("platform", "sprites/block.png"); //bloczki (najlepiej kwadratowe o wymiarze 50x50)
    this.load.image("bullet", "games/tanks/bullet.png" ); //pocisk (najlepiej niewielki okrągły)
    this.load.image("vendor", "games/gofish/fishie.png" ); // zamiast tej rybki to daj jakiegośgościa lub zwierzątko kwiatka (32x32)
    this.load.image("paddle", "games/breakout/paddle.png" ); //podstawka pod wrogów (60x16)
    this.load.image("enemy", "games/tanks/tank1.png") //wróg (około64 x64)

  //ładowanie spritesheet jako forme animacji 
  //najlepiej jak będziesz robić to w takim formacie: 32x48 jedna klatka
    this.load.spritesheet("player", "games/starstruck/dude.png", { 
      frameWidth: 32,
      frameHeight: 48
    });

     ///
    //podobnie jak wyżej dodaj też animacje jakiegoś diamentu/klejnotu
    ///
  }
 
var bullet; //zmienne do obsługi gry
var max_blocks= 3;
var lockCreate=0;
var lockShoot=0;
var direction =1;
var vendor;
var player, platforms;
var endgame1;
var endgame2;
var cursors;
var bullets;
var diamonds;
var helth=1;
var showScore= null;
var showBlocks= null;
var vendorText=null;

var score=0;
var paddles;
var enemies;
var enemybullets;


  function create() {
    
    let back = this.add.tileSprite(0, 0, 500, 300, "background"); //ładowanie tła
    back.setOrigin(0);
    back.setScrollFactor(0.1); //przewijanie tła
    this.cameras.main.setBounds(0, 0, sceneWidth, 720);
    this.physics.world.setBounds(0, 0, sceneWidth, 720);
  
    vendor = this.physics.add.sprite(150, 650, "vendor");
    player = this.physics.add.sprite(50, 650, "player");
    
    vendor.setCollideWorldBounds(true);
    player.setCollideWorldBounds(false);
    
    player.setBounce(0.2);
    this.cameras.main.startFollow(player);
  
    this.anims.create({
      key: "left",
      frames: this.anims.generateFrameNumbers("player", { start: 0, end: 3 }), //animacja chodu w lewo(tutaj musisz dać klatkichodu)
      frameRate: 10,
      repeat: -1
    });

    
  
    this.anims.create({
      key: "front",
      frames: [{ key: "player", frame: 4 }], //klatka stania w miejscu
      frameRate: 20
    });
  
    this.anims.create({
      key: "right",
      frames: this.anims.generateFrameNumbers("player", { start: 5, end: 8 }), //klatka chodu w prawo
      frameRate: 10,
      repeat: -1
    });

 
    
    
    cursors = this.input.keyboard.addKeys( //obsługa klawiszy WASD i spacji
      {up:Phaser.Input.Keyboard.KeyCodes.W,
      down:Phaser.Input.Keyboard.KeyCodes.S,
      left:Phaser.Input.Keyboard.KeyCodes.A,
      right:Phaser.Input.Keyboard.KeyCodes.D,
    space:Phaser.Input.Keyboard.KeyCodes.SPACE});

  
    platforms = this.physics.add.staticGroup(); //stworzenie dwóch platform
    platforms.create(150, 700, "platform");
    platforms.create(50, 700, "platform");

    
    bullets = this.physics.add.staticGroup(); //stworzenie kolekcji obiektów
    enemybullets = this.physics.add.staticGroup();
    diamonds= this.physics.add.staticGroup();
    paddles =this.physics.add.staticGroup();
    enemies =this.physics.add.staticGroup();


    this.anims.create({ //stworzenie animacji obracającego się diamentu( tutaj musisz obsłużyć)
      key: "diam",
      frames: this.anims.generateFrameNumbers("player", { start: 5, end: 8 }),
      frameRate: 10,
      repeat: -1
    });

    for(var i=0;i<diamenty;i++) //tworzenie instancji diamentów
    {
      diamonds.create(randomNumber(50, sceneWidth), randomNumber(50, 670), "player");
    }


    for(var i=0;i<wrogowie;i++) //tworzenie instancji wrogów
    {
      var localx=randomNumber(400, sceneWidth);
      var localy=randomNumber(150, 670)
      paddles.create(localx, localy, "paddle");
      enemies.create(localx, localy-50, "enemy");
    }

    platforms.getChildren().forEach(c => //skalowanie pudełek
      c
        .setScale(0.5)
        .setOrigin(0)
        .refreshBody()
    );

    paddles.create(600, 300, "paddle");
      enemies.create(600, 250, "enemy");


    this.physics.add.collider(player, platforms); //dodanie kolizji między obiektami tj pociski i pudła
    this.physics.add.collider(player, paddles);
    this.physics.add.collider(player, enemies);
    this.physics.add.collider(vendor, platforms);
    this.physics.add.collider(enemybullets, platforms);
    this.physics.add.collider(player, enemybullets);
    this.physics.add.collider(bullets, platforms);
  }

  function randomNumber(min, max){ //funkcja generująca liczby losowe w zakresie
    const r = Math.random()*(max-min) + min
    return Math.floor(r)
}

  function update() { //a ta funkcja powtarza wszystko w pętli
  if (cursors.left.isDown) { //obsługa klawisza w lewo( A animacja ruch itp)
    direction=0;
    player.setVelocityX(-150);
    player.anims.play("left", true);
    
  } else if (cursors.right.isDown) { //obsługa klawisza w prawo(D)
    direction =1;
    player.setVelocityX(150);
    player.anims.play("right", true);

  } else { //brak wciśniętego klawisza to stoi przodem 
    player.setVelocityX(0);
    player.anims.play("front");
  }
  if ( //obsługa klawisza W górę (W)
    cursors.up.isDown &&
    (player.body.touching.down || player.body.onFloor())
  ) {
    player.setVelocityY(-300);
  }

  enemies.getChildren().forEach(c =>{ //losowe tworzenie pocisków przez wroga(niech one będą widoczne)
    if(randomNumber(0, 1950)>1940)
    {
      if(player.x<c.x)
      {
        bullet = this.physics.add.sprite(c.x, c.y, "bullet"); 
       
        bullet.kont = Math.atan((player.y-c.y)/(c.x-player.x)); //ustawienia kąta tak aby celował w gracza
        bullet.kontc=Math.cos(bullet.kont)*-1
        bullet.konts=Math.sin(bullet.kont)
        console.log("Cos="+bullet.kontc)
        console.log("Sin="+bullet.konts)
        enemybullets.add(bullet)
      }
      else //ustawienia kąta tak aby celował w gracza tak samo tylko dla opcji po prawej stronie
      {
        bullet = this.physics.add.sprite(c.x, c.y, "bullet");  
        bullet.kont = Math.atan((player.y-c.y)/(c.x-player.x));
        bullet.kontc=Math.cos(bullet.kont)
        bullet.konts=Math.sin(bullet.kont)
        console.log("Cos="+bullet.kontc)
        console.log("Sin="+bullet.konts)
        enemybullets.add(bullet)
      }
    }
  }
    
      
  );


  if(game.input.activePointer.isDown && lockCreate==0){ //obsługa wciśnięcia myszy( tworzenie lub usuwanie klocka)
    if(platforms.getChildren().length==0) //jak nie ma żadnego klocka
    {
      lockCreate=1;
        platforms.create(game.input.mousePointer.worldX-25, game.input.mousePointer.worldY-25, "platform")
        .setScale(0.5)
        .setOrigin(0)
        .refreshBody()
        max_blocks--;
    }
    else{
    platforms.getChildren().forEach(c =>{ //usunięcie klocka po najechaniu i kliknięciu
      if(game.input.mousePointer.worldX >= c.x && game.input.mousePointer.worldX <= c.x+50)
      {
          if(game.input.mousePointer.worldY >= c.y && game.input.mousePointer.worldY <= c.y+50 )
         {
          lockCreate=1;
           c.destroy();
           max_blocks++;
           if(showBlocks!=null)
           showBlocks.destroy();
           showBlocks = this.add.text(850, 0, 'Bloki: ' + max_blocks, { font: "32px Arial" });
           showBlocks.setScrollFactor(0);
         }
      }
      else if(max_blocks>0&& lockCreate==0){ //utworzenie klocka
        lockCreate=1;
        platforms.create(game.input.mousePointer.worldX-25, game.input.mousePointer.worldY-25, "platform")
        .setScale(0.5)
        .setOrigin(0)
        .refreshBody()
        max_blocks--;

        if(showBlocks!=null) //wyświetlenie ilości dostępnych klocków
           showBlocks.destroy();
           showBlocks = this.add.text(800, 0, 'Bloki: ' + max_blocks, { font: "32px Arial" });
           showBlocks.setScrollFactor(0);
      }
      
    }
      );
  }
     
  }
  if(game.input.activePointer.isDown == false) //to obsługa żeby jeden raz sie wciskały klawisze (chociaż pewnie na to jest jakaś funkcja)
  {
    lockCreate=0;
  }

  if (cursors.space.isDown &&lockShoot==0) //obsługa spacj(strzału)
    {
        lockShoot=1;
        if(direction==1) //jak ostatnio było wciśnięte d to strzał w prawo
        {
        bullet = this.physics.add.sprite(player.x, player.y, "bullet"); 
        bullet.setVelocityX(700);
        bullets.add(bullet)
        }
        else if(direction==0)// a jak a to w lewo
        {
          bullet = this.physics.add.sprite(player.x, player.y, "bullet"); 
          bullet.setVelocityX(-700);
          bullets.add(bullet)
            
        } 
    }
    if (cursors.space.isDown==false)
    {
        lockShoot=0;       
    }
    diamonds.getChildren().forEach(c => //a tutaj zbieranie diamencików
      {
        c.anims.play("diam",true)
        if(player.x >= c.x-30 && player.x <= c.x+30)
      {
          if(player.y >= c.y-20 && player.y <= c.y+48 )
         {
          score++;
           c.destroy();
           if(showScore!=null)
           showScore.destroy();
           showScore = this.add.text(0, 0, 'Diamenty: ' + score+'/'+diamenty, { font: "32px Arial" });
           showScore.setScrollFactor(0);
         }
      }
      }
    );
    bullets.getChildren().forEach(c => //obsługa kolizji pocisków z instancją wroga
      {
        c.angle+=15;
        enemies.getChildren().forEach(d=>
          {
            if(c.x>d.x&&c.x<d.x+64&&c.y>d.y&&c.y<d.y+64)
            d.destroy();
          });
      }
      
    );
    enemybullets.getChildren().forEach(c =>{ //a jak dostaniemy pociskiem to
      c.angle+=15

      if(c.x>player.x&&c.x<player.x+32&&c.y>player.y&&c.y<player.y+48)
      {
        helth--; //not helth (he ded lol)
      }
      c.x=c.x+c.kontc*8;
      c.y=c.y+c.konts*8;
    }

    );

    if (cursors.down.isDown) {// obsługa klawisza w dół (do rozmowy z rybciom)

       if(player.x >= vendor.x-100 && player.x <= vendor.x+100)
      {
          if(player.y >= vendor.y-50 && player.y <= vendor.y+50 )
         {
           
          if(vendorText!=null)
          {
            vendorText.destroy()
          }
          if(score==0)
          vendorText=this.add.text(vendor.x-70, vendor.y-70, "Dobry Graczu\nprzynieś diamenciki\nale uważaj na wrogow", { font: "14px Arial" });
          if(score>0&&score<10)
          vendorText=this.add.text(vendor.x-70, vendor.y-70, "To nie wystarczy.\nPrzynieś więcej diamentów", { font: "14px Arial" });

          if(score==10)
          vendorText=this.add.text(vendor.x-70, vendor.y-70, "Już wystarczy.\nMożesz już iść do domu", { font: "14px Arial" });

           
         }
  
    }
}
if(player.x<25&&score==diamenty || player.y>700 || helth <1) //Blue screen of death
{
  var r1 = this.add.rectangle(500, 360, 1000, 720, 0x181234);
     r1.setScrollFactor(0);
    endgame1=this.add.text(150, 280, "Koniec Gry", { font: "144px Arial"});
    endgame2=this.add.text(120, 450, "Wciśnij Spację aby zagrać ponownie", { font: "48px Arial"});
    endgame1.setScrollFactor(0); 
    endgame2.setScrollFactor(0);
    if (cursors.space.isDown) 
    {
      helth=1;
      score=0;
      max_blocks=3;
      this.registry.destroy(); 
      this.events.off();
      this.scene.restart();
    }

}
if (cursors.down.isDown==false && vendorText!=null) vendorText.destroy()
  }
  
