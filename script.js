'use strict';

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// =============================================
// workout class
// =============================================
class Workout {
	date = new Date();
	id = (Date.now() + '').slice(-10);
	constructor(coords, distance, duration) {
		this.coords = coords; // [lat, lng]
		this.distance = distance; // in km
		this.duration = duration; // in minute
	}

	_setDescription() {
		// prettier-ignore
		const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

		this.description = `${this.type.replace(
			this.type[0],
			this.type[0].toUpperCase()
		)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
	}
}

// =============================================
// running class
// =============================================
class Running extends Workout {
	type = 'running';
	constructor(coords, distance, duration, cadence) {
		super(coords, distance, duration);
		this.cadence = cadence;
		this.calcPace();
		this._setDescription();
	}

	calcPace() {
		this.pace = this.duration / this.distance;
		return this.pace;
	}
}

// =============================================
// cycling class
// =============================================
class Cycling extends Workout {
	type = 'cycling';
	constructor(coords, distance, duration, elevationGain) {
		super(coords, distance, duration);
		this.elevationGain = elevationGain;
		this.calcSpeed();
		this._setDescription();
	}

	calcSpeed() {
		this.speed = this.distance / (this.duration / 60);
		return this.speed;
	}
}

const run1 = new Running(5, 1, [-23, 234], 54);
const cycling1 = new Cycling(5, 1, [-23, 234], 54);

// =============================================
// main app class
// =============================================
class App {
	#map;
	#mapEvent;
	#workouts = [];
	#mapZoomLevel = 13;
	constructor() {
		// Get user location
		this._getPosition();

		// get local Storage
		this._getLocalStorage();

		// event handlers
		form.addEventListener('submit', this._newWorkout.bind(this));
		inputType.addEventListener('change', this._toggleElevationField);
		containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
	}

	// Getting user position
	_getPosition() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				this._loadMap.bind(this),
				function () {
					alert('Can not get your current position 😐');
				}
			);
		}
	}

	_loadMap(position) {
		const { latitude } = position.coords;
		const { longitude } = position.coords;
		const coords = [latitude, longitude];
		this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

		L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
			maxZoom: 20,
			subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
		}).addTo(this.#map);

		// Handling click on map
		this.#map.on('click', this._showForm.bind(this));

		this.#workouts.forEach((work) => {
			this._renderMark(work);
		});
	}

	_showForm(mapE) {
		this.#mapEvent = mapE;
		form.classList.remove('hidden');
		inputDistance.focus();
	}

	_hideForm() {
		// Clear input fields
		inputDistance.value = inputCadence.value = inputDuration.value = inputElevation.value =
			'';

		form.style.display = 'none';
		form.classList.add('hidden');
		setTimeout(() => (form.style.display = 'grid'), 1000);
	}

	_toggleElevationField() {
		inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
		inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
	}

	_newWorkout(e) {
		// =========== Helper functions =============
		const validInputs = (...inputs) =>
			inputs.every((inp) => Number.isFinite(inp));
		const allPositive = (...inputs) => inputs.every((inp) => inp > 0);

		// preventing default behavior
		e.preventDefault();

		// Get data from form
		const type = inputType.value;
		const distance = +inputDistance.value;
		const duration = +inputDuration.value;
		const { lat, lng } = this.#mapEvent.latlng;
		let workout;

		// If workout running, create running object
		if (type === 'running') {
			const cadence = +inputCadence.value;

			// check if data is valid
			if (
				!validInputs(distance, duration, cadence) ||
				!allPositive(distance, duration, cadence)
			) {
				return alert('Inputs needs to be positive number!');
			}

			workout = new Running([lat, lng], distance, duration, cadence);
		}

		// If workout cycling, create cycling object
		if (type === 'cycling') {
			const elevation = +inputElevation.value;
			// check if data is valid
			if (
				!validInputs(distance, duration, elevation) ||
				!allPositive(distance, duration)
			) {
				return alert('Inputs needs to be positive number!');
			}

			workout = new Cycling([lat, lng], distance, duration, elevation);
		}

		// Add new object to workout array
		this.#workouts.push(workout);

		// Render workout on map as marker
		this._renderMark(workout);

		// Render workout on list
		this._renderWorkout(workout);

		// hide the form
		this._hideForm();

		// set local Storage
		this._setLocalStorage();
	}

	_renderWorkout(workout) {
		let html = `
			<li class="workout workout--${workout.type}" data-id="${workout.id}">
				<h2 class="workout__title">${workout.description}</h2>
				<div class="workout__details">
					<span class="workout__icon">${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}</span>
					<span class="workout__value">${workout.distance}</span>
					<span class="workout__unit">km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⏱</span>
					<span class="workout__value">${workout.duration}</span>
					<span class="workout__unit">min</span>
				</div>
		`;

		if (workout.type === 'running')
			html += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.pace.toFixed(1)}</span>
					<span class="workout__unit">min/km</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">🦶🏼</span>
					<span class="workout__value">${workout.cadence}</span>
					<span class="workout__unit">spm</span>
				</div>
        	</li>
			`;

		if (workout.type === 'cycling')
			html += `
				<div class="workout__details">
					<span class="workout__icon">⚡️</span>
					<span class="workout__value">${workout.speed.toFixed(1)}</span>
					<span class="workout__unit">km/h</span>
				</div>
				<div class="workout__details">
					<span class="workout__icon">⛰</span>
					<span class="workout__value">${workout.elevationGain}</span>
					<span class="workout__unit">m</span>
				</div>
			</li>
			`;

		form.insertAdjacentHTML('afterend', html);
	}

	_renderMark(workout) {
		L.marker(workout.coords)
			.addTo(this.#map)
			.bindPopup(
				L.popup({
					maxWidth: 250,
					minWidth: 100,
					autoClose: false,
					closeOnClick: false,
					className: `${workout.type}-popup`,
				}).setContent(
					`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
				)
			)
			.openPopup();
	}

	_moveToPopup(e) {
		const element = e.target.closest('.workout');
		if (!element) return;

		const workout = this.#workouts.find(
			(workout) => workout.id === element.dataset.id
		);
		this.#map.setView(workout.coords, this.#mapZoomLevel, {
			animate: true,
			pan: {
				duration: 1,
			},
		});
	}

	_setLocalStorage() {
		localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	}

	_getLocalStorage() {
		const data = JSON.parse(localStorage.getItem('workouts'));
		if (!data) return;
		this.#workouts = data;
		this.#workouts.forEach((work) => {
			this._renderWorkout(work);
		});
	}

	_reset(){
		localStorage.removeItem('workouts')
		location.reload();
	}
}

const app = new App();
