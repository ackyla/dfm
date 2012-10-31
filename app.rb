# -*- coding: utf-8 -*-
require 'sinatra/base'
require 'fb_graph'

class DfmApp < Sinatra::Base
  
  configure do
    APP_KEY, APP_SECRET = File.open(".key").read.split
  end

  error do
    "sorry"
  end
  
  not_found do
    "404"
  end
  
  get '/' do
    erb :index
  end

  get '/auth' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    redirect auth.client.authorization_uri()
  end

  get '/auth/callback' do
    auth = FbGraph::Auth.new APP_KEY, APP_SECRET, :redirect_uri => "#{request.scheme}://#{request.host}:#{request.port}/auth/callback"
    auth.client.authorization_code = params[:code]
    access_token = auth.client.access_token! :client_auth_body
    user = FbGraph::User.me(access_token).fetch
    user.name
    #redirect '/edit'
  end
  
  get '/edit' do
    erb :edit
  end

  post '/create' do
  end
end
