require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Show = require('../models/Show');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Drop the problematic text index if it exists
    try {
      await mongoose.connection.db.collection('movies').dropIndex('title_text_description_text');
      console.log('Dropped old text index');
    } catch (e) {
      // Index might not exist
    }

    // Drop the problematic shows index if it exists
    try {
      await mongoose.connection.db.collection('shows').dropIndex('movie_1_theater_1_showDate_1_showTime_1');
      console.log('Dropped old shows index');
    } catch (e) {
      // Index might not exist
    }

    // Clear existing data (except admin)
    await Movie.deleteMany({});
    await Show.deleteMany({});
    console.log('Cleared existing movies and shows');

    // Get or create admin
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin',
        email: process.env.ADMIN_EMAIL || 'admin@tickethub.com',
        phone: '1234567890',
        password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPassword123!', 10),
        role: 'admin'
      });
      console.log('Admin created');
    }

    // Create a theater owner
    let theaterOwner = await User.findOne({ role: 'theater' });
    if (!theaterOwner) {
      theaterOwner = await User.create({
        name: 'Theater Owner',
        email: 'theater@tickethub.com',
        phone: '9876543210',
        password: await bcrypt.hash('TheaterPass123!', 10),
        role: 'theater'
      });
      console.log('Theater owner created');
    }

    // Create or update theaters
    const theaters = [];
    
    // Theater 1: CineMax Multiplex
    let theater1 = await Theater.findOne({ name: 'CineMax Multiplex' });
    if (!theater1) {
      theater1 = await Theater.create({
        name: 'CineMax Multiplex',
        address: {
          street: '123 Cinema Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          zipCode: '400001'
        },
        phone: '022-12345678',
        email: 'contact@cinemax.com',
        owner: theaterOwner._id,
        amenities: ['Parking', 'Food Court', 'Dolby Atmos', '3D', 'IMAX'],
        screens: [
          {
            screenNumber: 1,
            name: 'IMAX',
            totalSeats: 150,
            rows: 10,
            seatsPerRow: 15,
            seatLayout: generateSeatLayout(10, 15)
          },
          {
            screenNumber: 2,
            name: 'Dolby Atmos',
            totalSeats: 120,
            rows: 8,
            seatsPerRow: 15,
            seatLayout: generateSeatLayout(8, 15)
          }
        ]
      });
    }
    theaters.push(theater1);

    // Theater 2: PVR Cinemas
    let theater2 = await Theater.findOne({ name: 'PVR Cinemas' });
    if (!theater2) {
      theater2 = await Theater.create({
        name: 'PVR Cinemas',
        address: {
          street: '456 Mall Road',
          city: 'Delhi',
          state: 'Delhi',
          zipCode: '110001'
        },
        phone: '011-87654321',
        email: 'contact@pvr.com',
        owner: theaterOwner._id,
        amenities: ['Parking', 'Food Court', '4DX', 'Dolby Atmos'],
        screens: [
          {
            screenNumber: 1,
            name: '4DX',
            totalSeats: 100,
            rows: 10,
            seatsPerRow: 10,
            seatLayout: generateSeatLayout(10, 10)
          },
          {
            screenNumber: 2,
            name: 'Gold Class',
            totalSeats: 80,
            rows: 8,
            seatsPerRow: 10,
            seatLayout: generateSeatLayout(8, 10)
          }
        ]
      });
    }
    theaters.push(theater2);

    // Theater 3: INOX
    let theater3 = await Theater.findOne({ name: 'INOX' });
    if (!theater3) {
      theater3 = await Theater.create({
        name: 'INOX',
        address: {
          street: '789 Central Plaza',
          city: 'Bangalore',
          state: 'Karnataka',
          zipCode: '560001'
        },
        phone: '080-99887766',
        email: 'contact@inox.com',
        owner: theaterOwner._id,
        amenities: ['Parking', 'Cafe', 'Dolby Atmos', '3D'],
        screens: [
          {
            screenNumber: 1,
            name: 'Insignia',
            totalSeats: 90,
            rows: 9,
            seatsPerRow: 10,
            seatLayout: generateSeatLayout(9, 10)
          }
        ]
      });
    }
    theaters.push(theater3);
    
    // Update owner's theater reference
    await User.updateOne({ _id: theaterOwner._id }, { theater: theater1._id });
    console.log(`Created ${theaters.length} theaters`);

    // Create sample movies with real poster URLs
    const movies = [
      {
        title: 'Oppenheimer',
        description: 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.',
        duration: 180,
        genre: ['Biography', 'Drama', 'History'],
        language: 'English',
        releaseDate: new Date('2023-07-21'),
        rating: 8.5,
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/fm6KqXpk3M2HVveHwCrBSSBaO0V.jpg',
        director: 'Christopher Nolan',
        certificate: 'UA',
        cast: [
          { name: 'Cillian Murphy', role: 'J. Robert Oppenheimer' },
          { name: 'Emily Blunt', role: 'Kitty Oppenheimer' },
          { name: 'Robert Downey Jr.', role: 'Lewis Strauss' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Dune: Part Two',
        description: 'Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.',
        duration: 166,
        genre: ['Sci-Fi', 'Adventure', 'Action'],
        language: 'English',
        releaseDate: new Date('2024-03-01'),
        rating: 8.8,
        posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
        director: 'Denis Villeneuve',
        certificate: 'UA',
        cast: [
          { name: 'Timothée Chalamet', role: 'Paul Atreides' },
          { name: 'Zendaya', role: 'Chani' },
          { name: 'Rebecca Ferguson', role: 'Lady Jessica' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Spider-Man: Across the Spider-Verse',
        description: 'Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People.',
        duration: 140,
        genre: ['Animation', 'Action', 'Adventure'],
        language: 'English',
        releaseDate: new Date('2023-06-02'),
        rating: 8.7,
        posterUrl: 'https://image.tmdb.org/t/p/w500/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/nGxUxi3PfXDRm7Vg95VBNgNM8yc.jpg',
        director: 'Joaquim Dos Santos',
        certificate: 'U',
        cast: [
          { name: 'Shameik Moore', role: 'Miles Morales' },
          { name: 'Hailee Steinfeld', role: 'Gwen Stacy' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'The Batman',
        description: 'When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate.',
        duration: 176,
        genre: ['Action', 'Crime', 'Drama'],
        language: 'English',
        releaseDate: new Date('2022-03-04'),
        rating: 7.8,
        posterUrl: 'https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg',
        director: 'Matt Reeves',
        certificate: 'UA',
        cast: [
          { name: 'Robert Pattinson', role: 'Bruce Wayne' },
          { name: 'Zoë Kravitz', role: 'Selina Kyle' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        duration: 169,
        genre: ['Sci-Fi', 'Adventure', 'Drama'],
        language: 'English',
        releaseDate: new Date('2014-11-07'),
        rating: 8.6,
        posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
        director: 'Christopher Nolan',
        certificate: 'UA',
        cast: [
          { name: 'Matthew McConaughey', role: 'Cooper' },
          { name: 'Anne Hathaway', role: 'Brand' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Avengers: Endgame',
        description: 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\' actions.',
        duration: 181,
        genre: ['Action', 'Adventure', 'Sci-Fi'],
        language: 'English',
        releaseDate: new Date('2019-04-26'),
        rating: 8.4,
        posterUrl: 'https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
        director: 'Anthony and Joe Russo',
        certificate: 'UA',
        cast: [
          { name: 'Robert Downey Jr.', role: 'Tony Stark' },
          { name: 'Chris Evans', role: 'Steve Rogers' },
          { name: 'Scarlett Johansson', role: 'Natasha Romanoff' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Inception',
        description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea.',
        duration: 148,
        genre: ['Action', 'Sci-Fi', 'Thriller'],
        language: 'English',
        releaseDate: new Date('2010-07-16'),
        rating: 8.8,
        posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
        director: 'Christopher Nolan',
        certificate: 'UA',
        cast: [
          { name: 'Leonardo DiCaprio', role: 'Cobb' },
          { name: 'Joseph Gordon-Levitt', role: 'Arthur' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'The Dark Knight',
        description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest tests.',
        duration: 152,
        genre: ['Action', 'Crime', 'Drama'],
        language: 'English',
        releaseDate: new Date('2008-07-18'),
        rating: 9.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/hkBaDkMWbLaf8B1lsWsKX7Ew3Xq.jpg',
        director: 'Christopher Nolan',
        certificate: 'UA',
        cast: [
          { name: 'Christian Bale', role: 'Bruce Wayne' },
          { name: 'Heath Ledger', role: 'Joker' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Guardians of the Galaxy Vol. 3',
        description: 'Still reeling from the loss of Gamora, Peter Quill rallies his team to defend the universe and one of their own.',
        duration: 150,
        genre: ['Action', 'Adventure', 'Comedy'],
        language: 'English',
        releaseDate: new Date('2023-05-05'),
        rating: 7.9,
        posterUrl: 'https://image.tmdb.org/t/p/w500/r2J02Z2OpNTctfOSN1Ydgii51I3.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/5YZbUmjbMa3ClvSW1Wj3D6XGolb.jpg',
        director: 'James Gunn',
        certificate: 'UA',
        cast: [
          { name: 'Chris Pratt', role: 'Peter Quill' },
          { name: 'Zoe Saldana', role: 'Gamora' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Barbie',
        description: 'Barbie and Ken are having the time of their lives in the colorful and perfect world of Barbie Land.',
        duration: 114,
        genre: ['Comedy', 'Adventure', 'Fantasy'],
        language: 'English',
        releaseDate: new Date('2023-07-21'),
        rating: 7.0,
        posterUrl: 'https://image.tmdb.org/t/p/w500/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
        bannerUrl: 'https://image.tmdb.org/t/p/original/ctMserH8g2SeOAnCw5gFjdQF8mo.jpg',
        director: 'Greta Gerwig',
        certificate: 'U',
        cast: [
          { name: 'Margot Robbie', role: 'Barbie' },
          { name: 'Ryan Gosling', role: 'Ken' }
        ],
        addedBy: theaterOwner._id
      },
      {
        title: 'Jananayagan',
        description: 'An action-packed thriller about a fearless warrior who fights against injustice to protect his people.',
        duration: 145,
        genre: ['Action', 'Thriller', 'Drama'],
        language: 'Tamil',
        releaseDate: new Date('2024-06-15'),
        rating: 7.5,
        posterUrl: 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQ3B0sFlZuLRwUSTFCAI0J7t8HTN_-v6TTEDNP1k0J-msfaJS8Y',
        bannerUrl: 'https://encrypted-tbn2.gstatic.com/images?q=tbn:ANd9GcQ3B0sFlZuLRwUSTFCAI0J7t8HTN_-v6TTEDNP1k0J-msfaJS8Y',
        director: 'Ranjit Jeyakodi',
        certificate: 'UA',
        cast: [
          { name: 'Vijay Antony', role: 'Lead Role' },
          { name: 'Suresh Gopi', role: 'Supporting Role' }
        ],
        addedBy: theaterOwner._id
      }
    ];

    const createdMovies = await Movie.insertMany(movies);
    console.log(`Created ${createdMovies.length} movies`);

    // Create shows for next 7 days across all theaters
    const shows = [];
    const showTimes = ['10:00', '13:30', '17:00', '20:30'];
    
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date();
      date.setDate(date.getDate() + dayOffset);
      
      for (const movie of createdMovies) {
        // Create shows in multiple theaters
        for (const theater of theaters) {
          // 1-2 shows per movie per theater per day
          const numShows = Math.floor(Math.random() * 2) + 1;
          
          for (let i = 0; i < numShows; i++) {
            const time = showTimes[i % showTimes.length];
            const [hours, minutes] = time.split(':');
            const showTime = new Date(date);
            showTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
            
            // Skip if show time is in the past
            if (showTime < new Date()) continue;
            
            const screen = theater.screens[i % theater.screens.length];
            
            shows.push({
              movie: movie._id,
              theater: theater._id,
              screenNumber: screen.screenNumber,
              showTime,
              endTime: new Date(showTime.getTime() + movie.duration * 60000),
              pricing: {
                regular: 150 + (i * 50),
                premium: 250 + (i * 50),
                vip: 400 + (i * 50)
              },
              totalSeats: screen.totalSeats,
              availableSeats: screen.totalSeats
            });
          }
        }
      }
    }

    await Show.insertMany(shows);    await Show.insertMany(shows);
    console.log(`Created ${shows.length} shows`);

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('------------------------');
    console.log('Admin:');
    console.log(`  Email: ${process.env.ADMIN_EMAIL || 'admin@tickethub.com'}`);
    console.log(`  Password: ${process.env.ADMIN_PASSWORD || 'AdminPassword123!'}`);
    console.log('\nTheater Owner:');
    console.log('  Email: theater@tickethub.com');
    console.log('  Password: TheaterPass123!');
    console.log('------------------------\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

function generateSeatLayout(rows, seatsPerRow) {
  const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const layout = [];
  
  for (let i = 0; i < rows; i++) {
    const seats = [];
    for (let j = 1; j <= seatsPerRow; j++) {
      seats.push({
        number: j,
        type: i < 2 ? 'vip' : (i < 4 ? 'premium' : 'regular'),
        isAvailable: true
      });
    }
    layout.push({
      row: rowLabels[i],
      seats
    });
  }
  
  return layout;
}

seedData();
