from flask import Blueprint, render_template, request, redirect, url_for, session,flash
import sqlite3

routes = Blueprint('routes', __name__)


@routes.route('/about')
def about():
    return render_template('about.html')

@routes.route('/edit-profile')
def edit_profile():
    return render_template('edit_profile.html')

@routes.route('/login', methods=['GET', 'POST'])
def login():
    return render_template('login.html')

@routes.route('/Fdashboard')
def dashboard():
    return render_template('Fdashboard.html')

@routes.route('/Edashboard')
def edashboard():
    return render_template('employer_dashboard.html')

@routes.route('/Jobs')
def jobs():
    return render_template('Fjobs.html')

@routes.route('/wallet-login')
def wallet_login():
    """A simple page for returning users to log in."""
    return render_template('wallet_login.html')